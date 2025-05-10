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
  const [selectedTab, setSelectedTab] = useState(0);
  const [hasCommented, setHasCommented] = useState(false);

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
          const data = snap.data();
          setVoteData(data);
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

  const handleVote = async (index) => {
    if (voted || loading) return;
    setLoading(true);
    try {
      const postRef = doc(db, "posts", postId);
      const snap = await getDoc(postRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const updatedOptions = [...data.options];
      updatedOptions[index].votes += 1;

      await updateDoc(postRef, { options: updatedOptions });
      localStorage.setItem(`voted-${postId}`, index);
      setVoted(true);
      setVotedOption(index);
      setVoteData({ ...data, options: updatedOptions });
    } catch (e) {
      console.error("투표 실패:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelVote = async () => {
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
  };

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
        {voteData?.options && (
          <div className="flex gap-2 mb-4">
            {voteData.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedTab(idx)}
                className={`flex-1 py-2 rounded-md text-sm font-semibold ${
                  selectedTab === idx
                    ? "bg-[#4B3621] text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {opt.label || `선택지 ${idx + 1}`}
              </button>
            ))}
          </div>
        )}
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

        {voteData?.mainImages?.length > 0 && (
          <div className="mb-6">
            <Swiper
              modules={[Navigation, Pagination]}
              navigation
              pagination={{ clickable: true }}
              spaceBetween={8}
              slidesPerView={1}
            >
              {voteData.mainImages.map((url, idx) => (
                <SwiperSlide key={idx}>
                  <img
                    src={url}
                    alt={`본문 이미지 ${idx + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {voteData?.options?.map((opt, idx) => (
          <div key={idx} className={`mb-4 ${selectedTab === idx ? "" : "hidden"}`}>
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {opt.imageUrl && (
                <img
                  src={opt.imageUrl}
                  alt={opt.label || opt.text}
                  className="w-full h-48 object-cover"
                  onClick={() => handleVote(idx)}
                />
              )}
              <div className="p-4 text-center">
                <p className="font-semibold text-base mb-2">
                  {opt.label || opt.text || `선택지 ${idx + 1}`}
                </p>
                <button
                  onClick={() => handleVote(idx)}
                  disabled={voted || loading}
                  className={`w-full py-2 rounded font-semibold ${
                    votedOption === idx
                      ? "bg-gray-400 text-white cursor-default"
                      : "bg-[#4B3621] hover:bg-[#3A2A1A] text-white"
                  }`}
                >
                  {votedOption === idx ? "투표 완료" : "선택"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {voted && (
          <div className="text-center mt-2">
            <button
              onClick={handleCancelVote}
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
        {voted && (
          <>
            {/* ✅ 베스트 댓글 섹션 */}
            <div className="mt-8">
              <h2 className="text-base font-bold text-[#4B3621] mb-2">🔥 베스트 댓글 TOP 3</h2>
              <CommentSection
                postId={postId}
                optionIndex={selectedTab}
                votePercent={0}
                myVote={votedOption}
                mode="best"
              />
            </div>

            {/* ✅ 일반 댓글 섹션 */}
            <div className="mt-8">
              <h2 className="text-base font-bold text-[#4B3621] mb-2">
                💬 선택지 {selectedTab + 1} 댓글
              </h2>
              <CommentSection
                postId={postId}
                optionIndex={selectedTab}
                votePercent={0}
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
