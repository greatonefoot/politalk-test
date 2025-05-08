// src/components/pages/VotePage.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../Header";
import CommentSection from "./CommentSection";
import HotPostsSidebar from "../HotPostsSidebar";
import { db, auth } from "../../firebase";
import { doc, updateDoc, increment, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUid, setCurrentUid] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => setRendered(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUid(user.uid);
      } else {
        const anonId = localStorage.getItem("anon-id");
        if (anonId) {
          setCurrentUid(anonId);
        } else {
          const newId = crypto.randomUUID();
          localStorage.setItem("anon-id", newId);
          setCurrentUid(newId);
        }
      }
    });
    return () => unsubscribe();
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
      } catch (err) {
        console.error("투표 데이터 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    const incrementViewCount = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, { views: increment(1) });
      } catch (error) {
        console.error("조회수 증가 실패:", error);
      }
    };

    fetchData();
    incrementViewCount();
  }, [postId]);

  useEffect(() => {
    const warnTimeout = setTimeout(() => {
      if (loading) {
        alert("불러오는 데 시간이 오래 걸립니다. 인터넷 상태를 확인해주세요.");
      }
    }, 8000);
    return () => clearTimeout(warnTimeout);
  }, [loading]);

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
      window.dispatchEvent(new Event("voted"));
    } catch (e) {
      console.error("투표 실패:", e);
    }
    setLoading(false);
  };

  const handleCancelVote = async () => {
    if (!voted || loading || votedOption === null || !currentUid) return;

    const hasCommented = await hasWrittenCommentForOption(currentUid, postId, votedOption);
    if (hasCommented) {
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

  const getVotePercents = () => {
    if (!voteData || !Array.isArray(voteData.options)) return [];
    const total = voteData.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
    return voteData.options.map(opt => (opt.votes / total) * 100);
  };
  const votePercents = getVotePercents();

  const getBackgroundColor = (percent) => {
    if (percent >= 60) return "bg-green-100";
    if (percent >= 40) return "bg-yellow-100";
    if (percent >= 20) return "bg-orange-100";
    return "bg-red-100";
  };

  const toggleSection = (index) => {
    setVisibleSections(prev => ({
      ...prev,
      [index]: !(prev[index] ?? true),
    }));
  };

  if (loading || !voteData || !voteData.options) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
        <p className="mt-4 text-gray-600 text-lg">투표 정보를 불러오는 중입니다...</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-100 min-h-screen">
      <Header categories={[]} selectedCategory="전체" setSelectedCategory={() => {}} searchTerm="" setSearchTerm={() => {}} />
      <HotPostsSidebar />
      <main className="pt-10 px-4 flex flex-col items-center max-w-screen-xl mx-auto">
        <div className="w-full">
          <p className="text-sm text-gray-600 mb-2 ml-1">작성자: {authorName}</p>

          {voteData.imageUrls?.length > 0 && (
            <div className="mb-6 relative max-w-2xl mx-auto">
              <Swiper modules={[Navigation, Pagination]} spaceBetween={10} slidesPerView={1} navigation pagination={{ clickable: true }}>
                {voteData.imageUrls.map((url, idx) => (
                  <SwiperSlide key={idx}>
                    <img src={url} alt={`본문 이미지 ${idx + 1}`} className="w-full max-h-[400px] object-contain rounded" />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          )}

          {voteData.content && (
            <div className="bg-white p-6 rounded-xl shadow mb-6 border border-gray-200 mx-auto max-w-2xl">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📄 본문 내용</h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-[15px] tracking-wide break-words">
                {voteData.content}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-center items-center gap-4 my-6">
            {voteData.options.map((opt, idx) => (
              <div key={idx} className={`bg-white rounded-xl shadow-md overflow-hidden w-full max-w-xs transition transform hover:scale-105 ${votedOption === idx ? "ring-2 ring-green-400" : ""}`}>
                {opt.imageUrl && (
                  <img src={opt.imageUrl} alt={opt.label || opt.text} className="w-full h-48 object-cover cursor-pointer" onClick={() => handleVote(idx)} />
                )}
                <div className="p-4 text-center">
                  <p className="font-semibold text-lg mb-2">{opt.label || opt.text || `선택지 ${idx + 1}`}</p>
                  <button onClick={() => handleVote(idx)} disabled={voted || loading} className={`w-full py-2 rounded font-semibold ${votedOption === idx ? "bg-gray-400 text-white cursor-default" : "bg-green-500 hover:bg-green-600 text-white"}`}>
                    {votedOption === idx ? "투표 완료" : "선택"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {voted && (
            <div className="text-center">
              <button onClick={handleCancelVote} className="text-sm text-red-600 underline mt-2">⛔ 투표 취소하기</button>
            </div>
          )}
        </div>

        {voted && voteData.options.length > 0 && (
          <div className="mt-6 text-sm text-gray-600 text-center">
            {voteData.options.map((opt, idx) => !visibleSections[idx] && (
              <button key={idx} onClick={() => toggleSection(idx)} className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-full mx-1 mb-2 transition">
                {opt.label || `진영 ${idx + 1}`} 댓글 다시 보기
              </button>
            ))}
          </div>
        )}

        {voted && Array.isArray(voteData.options) ? (
          <div className="w-full px-4 mt-10 flex flex-col lg:flex-row gap-2 justify-center items-start">
            {voteData.options.map((opt, idx) => {
              const percent = votePercents[idx];
              const isVisible = visibleSections[idx] ?? true;
              const bgColor = getBackgroundColor(percent);
              return (
                <div
                  key={idx}
                  style={{
                    width: rendered ? `${percent}%` : "0%",
                    minWidth: "280px",
                    maxWidth: "100%",
                    transition: "width 0.7s ease",
                  }}
                  className={`${bgColor} p-3 rounded relative group ${isVisible ? "block" : "hidden"}`}
                >
                  <div className="absolute top-2 right-2 bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded shadow cursor-default group-hover:opacity-100 opacity-80 transition">
                    {Math.round(percent)}%
                    <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none z-50">
                      전체 투표 중 {Math.round(percent)}%
                    </div>
                  </div>
                  <button onClick={() => toggleSection(idx)} className="text-sm text-gray-600 underline mb-2">{isVisible ? "댓글 숨기기" : "댓글 보기"}</button>
                  {isVisible && <CommentSection postId={postId} optionIndex={idx} votePercent={percent} myVote={votedOption} />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-12">투표 완료 후 댓글을 확인할 수 있습니다.</div>
        )}
      </main>
    </div>
  );
};

export default VotePage;
