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
// ✅ Swiper (이미지 슬라이드용) 관련 import
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";


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
      setViewMode(Number(stored));
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
    <div className="bg-white min-h-screen pb-10">
      <Header />
      <div className="w-full max-w-[480px] mx-auto p-4">
        {(voteData?.title || voteData?.content) && (
  <div className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-5 mb-6">
    {voteData?.title && (
      <h1 className="text-lg font-extrabold text-[#4B3621] text-center mb-3">
         {voteData.title}
      </h1>
    )}
    {voteData?.content && (
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line text-center">
        {voteData.content}
      </p>
    )}
  </div>
)}

      {voteData.mainImages?.length > 0 && (
  <div className="mb-4">
    <Swiper
      modules={[Navigation, Pagination]}
      navigation
      pagination={{ clickable: true }}
      spaceBetween={10}
      slidesPerView={1}
    >
      {voteData.mainImages.map((url, idx) => (
        <SwiperSlide key={idx}>
          <img
            src={url}
            alt={`본문 이미지 ${idx + 1}`}
            className="w-full rounded max-h-80 object-contain"
          />
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
)}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {voteData.options.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedOption(idx)}
              className={`p-4 rounded-lg border-2 text-center cursor-pointer transition-all duration-300
                ${selectedOption === idx ? "border-[#4B3621] bg-[#f1e9e1] scale-105" : "border-gray-300 bg-white"}`}
            >
              <p className="font-semibold text-sm">
                {opt.label || opt.text || `선택지 ${idx + 1}`}
              </p>
              {opt.imageUrl && (
  <img
    src={opt.imageUrl}
    alt={`선택지 ${idx + 1} 이미지`}
    className="w-full max-h-40 object-contain rounded mt-2"
  />
)}

              {voted && (
                <p className="text-xs text-gray-500 mt-1">{votePercents[idx]}%</p>
              )}
            </div>
          ))}
        </div>

        {voted && (
          <div className="mb-6 space-y-2">
            {voteData.options.map((opt, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm text-[#4B3621] font-semibold">
                  <span>{opt.label || opt.text || `선택지 ${idx + 1}`}</span>
                  <span>{votePercents[idx]}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                  <div
                    className="h-2 bg-[#4B3621] transition-all duration-500"
                    style={{ width: `${votePercents[idx]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

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
                setViewMode(selectedOption);
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
                  setViewMode("my");
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
              ? 투표 취소하기
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
            <div className="flex flex-wrap justify-center gap-2 my-4">
              {voteData.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setViewMode(idx)}
                  className={`px-3 py-1 rounded text-sm ${
                    viewMode === idx ? "bg-[#4B3621] text-white" : "bg-gray-200"
                  }`}
                >
                  {opt.label || opt.text || `선택지 ${idx + 1}`}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <h2 className="text-base font-bold text-[#4B3621] mb-2">
                {voteData.options[viewMode]?.label || `선택지 ${viewMode + 1}`} 댓글
              </h2>
              <CommentSection
                postId={postId}
                optionIndex={viewMode}
                votePercent={votePercents[viewMode] || 0}
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
