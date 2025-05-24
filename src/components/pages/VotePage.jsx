import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../Header";
import CommentSection from "./CommentSection";
import HotPostsSidebar from "../HotPostsSidebar";
import { db, auth } from "../../firebase";
import {
  doc, updateDoc, increment, getDoc,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

async function hasWrittenCommentForOption(uid, postId, optionIndex) {
  if (!uid) return false;
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    where("optionIndex", "==", optionIndex),
    where("authorId", "==", uid)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

const VotePage = () => {
  const { postId } = useParams();
  const [voted, setVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const [voteData, setVoteData] = useState(null);
  const [authorName, setAuthorName] = useState("로딩 중...");
  const [visibleSections, setVisibleSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);
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
    const stored = localStorage.getItem(`voted-${postId}`);
    if (stored !== null) {
      setVoted(true);
      setVotedOption(Number(stored));
    }
    const interval = setInterval(() => {
      const stored = localStorage.getItem(`voted-${postId}`);
      if (stored !== null) {
        setVoted(true);
        setVotedOption(Number(stored));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [postId]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        if (snap.exists()) {
          const postData = snap.data();
          setVoteData(postData);
          if (postData.authorUid) {
            const userSnap = await getDoc(doc(db, "users", postData.authorUid));
            setAuthorName(userSnap.exists() ? userSnap.data().name || "이름 없음" : "이름 없음");
          } else {
            setAuthorName("익명");
          }
        }
      } catch (e) {
        console.error("투표 데이터 불러오기 실패:", e);
      } finally {
        setLoading(false);
      }
    };

    const incrementViews = async () => {
      try {
        await updateDoc(doc(db, "posts", postId), { views: increment(1) });
      } catch (e) {
        console.error("조회수 증가 실패:", e);
      }
    };

    fetchData();
    incrementViews();
  }, [postId]);
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
    }
    setLoading(false);
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
    }
    setLoading(false);
  };

  const toggleSection = (index) => {
    setVisibleSections((prev) => ({
      ...prev,
      [index]: !(prev[index] ?? true),
    }));
  };

  if (loading || !voteData || !Array.isArray(voteData.options)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">불러오는 중...</p>
      </div>
    );
  }

  const getVotePercents = () => {
    const total = voteData.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
    return voteData.options.map((opt) => (opt.votes / total) * 100);
  };

  const votePercents = getVotePercents();

  return (
    <div className="bg-white min-h-screen">
      <Header categories={[]} selectedCategory="전체" setSelectedCategory={() => {}} searchTerm="" setSearchTerm={() => {}} />
      <HotPostsSidebar />
      <main className="mt-20 px-4 flex flex-col items-center max-w-screen-xl mx-auto">
        <div className="w-full">
        <div className="bg-white border border-gray-200 shadow-md rounded-xl px-8 py-6 max-w-3xl mx-auto mb-12">
  <h1 className="text-3xl font-extrabold text-center text-[#4B3621] mb-4">
     {voteData?.title || "제목 없음"}
  </h1>

  {voteData?.content && (
    <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line text-center">
      {voteData.content}
    </p>
  )}
</div>



          {voteData.mainImages?.length > 0 && (
            <div className="w-full max-w-2xl mx-auto mb-6">
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
                      className="w-full object-contain rounded-lg max-h-[600px]"
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}

         <div className="flex flex-col md:flex-row justify-center items-center gap-4 my-20 md:mt-40">
            {voteData.options.map((opt, idx) => (
              <div key={idx} className={`bg-white rounded-xl shadow-md overflow-hidden w-full max-w-xs transition transform hover:scale-105 ${votedOption === idx ? "ring-2 ring-[#C8A97E]" : ""}`}>
                {opt.imageUrl && (
                  <img
  src={opt.imageUrl}
  alt={opt.label || opt.text}
  className="w-full object-contain max-h-[300px] bg-white cursor-pointer rounded-t"
  onClick={() => handleVote(idx)}
/>

                )}
                <div className="p-4 text-center">
                  <p className="font-semibold text-lg mb-2">
                    {opt.label || opt.text || `선택지 ${idx + 1}`}
                  </p>
                  <button
                    onClick={() => handleVote(idx)}
                    disabled={voted || loading}
                    className={`w-full py-2 rounded font-semibold ${votedOption === idx ? "bg-gray-400 text-white cursor-default" : "bg-[#4B3621] hover:bg-[#3A2A1A] text-white"}`}
                  >
                    {votedOption === idx ? "투표 완료" : "선택"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {voted && (
            <div className="text-center">
              <button
                onClick={handleCancelVote}
                disabled={hasCommented}
                className={`text-sm underline mt-2 ${
                  hasCommented ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-800"
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
        </div>

        {voted && (
          <div className="flex flex-col md:flex-row w-full gap-2 mt-10 items-stretch">
            {(() => {
              const visibleVotes = voteData.options.reduce(
                (sum, opt, i) => visibleSections[i] !== false ? sum + opt.votes : sum,
                0
              );

              const MIN_RATIO = 0.2;
              let tempRatios = voteData.options.map((opt, i) =>
                visibleSections[i] === false ? 0 : visibleVotes === 0 ? 1 : opt.votes / visibleVotes
              );

              tempRatios = tempRatios.map((r, i) =>
                visibleSections[i] === false ? 0 : Math.max(r, MIN_RATIO)
              );

              const ratioSum = tempRatios.reduce((sum, r) => sum + r, 0);
              const finalPercents = tempRatios.map((r, i) =>
                visibleSections[i] === false ? 0 : (r / ratioSum) * 100
              );

              return voteData.options.map((opt, idx) => {
                const isVisible = visibleSections[idx] !== false;
                const rawPercent = votePercents[idx];
                const adjustedPercent = finalPercents[idx];
                

                return (
                  <div
                    key={idx}
                    style={
                      isVisible
                        ? {
                            flexGrow: 1,
                            flexBasis: `${adjustedPercent}%`,
                            maxWidth: `${adjustedPercent}%`,
                            transition: "all 0.5s ease",
                            overflow: "hidden",
                          }
                        : {
                            flex: "0 0 100px",
                            maxWidth: "100px",
                            minWidth: "100px",
                            backgroundColor: "#F3F3F3",
                            borderRadius: "0.5rem",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }
                    }
                    className={isVisible ? "bg-[#f8f8f8] p-3 rounded shadow relative group" : ""}

                  >
                    {isVisible ? (
                      <>
                        <div className="sticky top-0 z-10 bg-opacity-70 bg-inherit flex justify-between items-center mb-2 py-1 px-1 backdrop-blur">
                       <button
  onClick={() => toggleSection(idx)}
  className="text-sm font-semibold text-[#4B3621] underline flex items-center gap-1 hover:text-[#3A2A1A]"
>
  🔽 {opt.label || opt.text || `선택지 ${idx + 1}`} 숨기기
</button>

                          <span className="text-xs text-gray-500">{Math.round(rawPercent)}%</span>
                        </div>

                        <div className="w-full h-2 bg-white rounded overflow-hidden mb-3">
                          <div
                            className="h-full bg-[#4B3621] transition-all duration-500"
                            style={{ width: `${rawPercent}%` }}
                          />
                        </div>

                        <CommentSection
                          postId={postId}
                          optionIndex={idx}
                          votePercent={rawPercent}
                          myVote={votedOption}
                        />
                      </>
                    ) : (
                   <button
  onClick={() => toggleSection(idx)}
  className="text-sm font-semibold text-[#4B3621] underline hover:text-[#3A2A1A]"
>
  🔼 {opt.label || opt.text || `선택지 ${idx + 1}`} 보기
</button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
      </main>
    </div>
  );
};

export default VotePage;
