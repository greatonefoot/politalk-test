import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../Header";
import CommentSection from "./CommentSection";
import { db, auth } from "../../firebase";
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const VotePageMobile = () => {
  const { postId } = useParams();
  const [voteData, setVoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);
  const [voted, setVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasCommented, setHasCommented] = useState(false);
  const [viewMode, setViewMode] = useState("my");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUid(user.uid);
      } else {
        const anon = localStorage.getItem("anon-id") || crypto.randomUUID();
        localStorage.setItem("anon-id", anon);
        setCurrentUid(anon);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        if (snap.exists()) {
          setVoteData(snap.data());
        }
      } catch (e) {
        console.error("투표 데이터 로딩 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    const stored = localStorage.getItem(`voted-${postId}`);
    if (stored !== null) {
      setVoted(true);
      setVotedOption(Number(stored));
    }

    fetchData();
    updateDoc(doc(db, "posts", postId), { views: increment(1) }).catch(() =>
      console.error("조회수 증가 실패")
    );
  }, [postId]);

  const hasWrittenCommentForOption = async (uid, postId, optionIndex) => {
    if (!uid) return false;
    const q = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      where("optionIndex", "==", optionIndex),
      where("authorId", "==", uid)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  };

  useEffect(() => {
    const checkCommented = async () => {
      if (!currentUid || votedOption === null) return;
      const result = await hasWrittenCommentForOption(currentUid, postId, votedOption);
      setHasCommented(result);
    };
    checkCommented();
  }, [currentUid, postId, votedOption]);

  const getVotePercents = () => {
    const total = voteData.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
    return voteData.options.map((opt) => Math.round((opt.votes / total) * 100));
  };

  const votePercents = voteData ? getVotePercents() : [];

  if (loading || !voteData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-500 text-sm">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fdfaf6] min-h-screen pb-10">
      <Header />
      <div className="w-full max-w-[480px] mx-auto p-4">
        {voteData?.title && (
          <h1 className="text-xl font-bold text-center text-[#4B3621] mb-2">
            {voteData.title}
          </h1>
        )}

        {voteData?.content && (
          <p className="text-sm text-center text-[#333] leading-relaxed mb-4 whitespace-pre-line">
            {voteData.content}
          </p>
        )}

        {/* 선택지 2개 동시에 표시 */}
        <div className="flex gap-2 mb-4">
          {voteData.options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`flex-1 p-4 rounded-lg border-2 text-center cursor-pointer transition-all duration-300
                ${selectedOption === idx ? "border-[#4B3621] bg-[#f1e9e1] scale-105" : "border-gray-300 bg-white"}`}
            >
              <p className="font-semibold text-sm">{opt.label || opt.text || `선택지 ${idx + 1}`}</p>
              {voted && <p className="text-xs text-gray-500 mt-1">{votePercents[idx]}%</p>}
            </div>
          ))}
        </div>

        {!voted && (
          <button
            onClick={async () => {
              if (voted || loading || selectedOption === null) return;
              setLoading(true);
              try {
                const postRef = doc(db, "posts", postId);
                const snap = await getDoc(postRef);
                if (!snap.exists()) return;
                const data = snap.data();
                const updatedOptions = [...data.options];
                updatedOptions[selectedOption].votes += 1;
                await updateDoc(postRef, { options: updatedOptions });
                localStorage.setItem(`voted-${postId}`, selectedOption);
                setVoted(true);
                setVotedOption(selectedOption);
                setVoteData({ ...data, options: updatedOptions });
              } catch (e) {
                console.error("투표 실패:", e);
              } finally {
                setLoading(false);
              }
            }}
            disabled={selectedOption === null}
            className={`w-full py-2 rounded font-semibold text-white transition ${
              selectedOption === null
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-[#4B3621] hover:bg-[#3A2A1A]"
            }`}
          >
            선택
          </button>
        )}

        {voted && (
          <div className="text-center mt-2">
            <button
              onClick={async () => {
                if (!voted || loading || votedOption === null || !currentUid) return;
                const commented = await hasWrittenCommentForOption(currentUid, postId, votedOption);
                if (commented) {
                  alert("댓글을 작성한 경우 투표를 취소할 수 없습니다.");
                  return;
                }
                setLoading(true);
                try {
                  const postRef = doc(db, "posts", postId);
                  const snap = await getDoc(postRef);
                  if (!snap.exists()) return;
                  const data = snap.data();
                  const updatedOptions = [...data.options];
                  if (updatedOptions[votedOption].votes > 0) {
                    updatedOptions[votedOption].votes -= 1;
                  }
                  await updateDoc(postRef, { options: updatedOptions });
                  localStorage.removeItem(`voted-${postId}`);
                  setVoted(false);
                  setVotedOption(null);
                  setVoteData({ ...data, options: updatedOptions });
                } catch (e) {
                  console.error("투표 취소 실패:", e);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={hasCommented}
              className={`text-xs underline ${
                hasCommented
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-red-600 hover:text-red-800"
              }`}
            >
              ⛔ 투표 취소하기
            </button>
            {hasCommented && (
              <p className="text-xs text-gray-500 mt-1">
                이미 댓글을 작성해서 투표를 취소할 수 없습니다.
              </p>
            )}
          </div>
        )}

        {voted && votedOption !== null && (
          <>
            <div className="flex justify-center gap-2 my-4">
              <button
                onClick={() => setViewMode("my")}
                className={`px-3 py-1 rounded ${
                  viewMode === "my" ? "bg-[#4B3621] text-white" : "bg-gray-200"
                }`}
              >
                내 진영 댓글
              </button>
              <button
                onClick={() => setViewMode("opponent")}
                className={`px-3 py-1 rounded ${
                  viewMode === "opponent" ? "bg-[#4B3621] text-white" : "bg-gray-200"
                }`}
              >
                상대 진영 댓글
              </button>
            </div>

            <div className="mt-4">
              <h2 className="text-base font-bold text-[#4B3621] mb-2">
                💬 {viewMode === "my" ? "내 진영 댓글" : "상대 진영 댓글"}
              </h2>
              <CommentSection
                postId={postId}
                optionIndex={viewMode === "my" ? votedOption : 1 - votedOption}
                votePercent={votePercents[viewMode === "my" ? votedOption : 1 - votedOption] || 0}
                myVote={votedOption}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VotePageMobile;
