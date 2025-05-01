import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";

const VoteSection = ({ postId, setDeadlineState }) => {
  const [post, setPost] = useState(null);
  const [selected, setSelected] = useState(null);
  const [voted, setVoted] = useState(false);
  const [remainingTime, setRemainingTime] = useState("");
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const data = postSnap.data();
        setPost(data);
        setupDeadlineTimer(data.deadline);
        setReportCount(data.reports || 0);
      }
    };
    fetchPost();

    const votedOption = localStorage.getItem(`voted-${postId}`);
    if (votedOption !== null) {
      setSelected(Number(votedOption));
      setVoted(true);
    }
  }, [postId]);

  const setupDeadlineTimer = (deadline) => {
    if (!deadline) return;
    const deadlineDate = new Date(deadline.seconds * 1000);
    const interval = setInterval(() => {
      const now = new Date();
      const diff = deadlineDate - now;
      if (diff <= 0) {
        setRemainingTime("마감됨");
        setDeadlineState?.(true);
        clearInterval(interval);
      } else {
        const min = Math.floor(diff / 60000);
        const sec = Math.floor((diff % 60000) / 1000);
        setRemainingTime(`${min}분 ${sec}초 남음`);
      }
    }, 1000);
  };

  const handleVote = async (index) => {
    if (voted || !post) return;

    const updatedOptions = [...post.options];
    updatedOptions[index].votes += 1;

    await updateDoc(doc(db, "posts", postId), { options: updatedOptions });

    setPost((prev) => ({ ...prev, options: updatedOptions }));
    setSelected(index);
    setVoted(true);

    localStorage.setItem(`voted-${postId}`, index);
    window.dispatchEvent(new Event("voted")); // 댓글창 실시간 반영용
  };

  const cancelVote = async () => {
    const hasCommented = localStorage.getItem(`commented-${postId}`) === "true";
    if (hasCommented) {
      alert("댓글을 작성한 경우 투표를 취소할 수 없습니다.");
      return;
    }

    if (!post || selected === null) return;

    const updatedOptions = [...post.options];
    updatedOptions[selected].votes = Math.max(0, updatedOptions[selected].votes - 1);

    await updateDoc(doc(db, "posts", postId), { options: updatedOptions });

    setPost((prev) => ({ ...prev, options: updatedOptions }));
    setSelected(null);
    setVoted(false);

    localStorage.removeItem(`voted-${postId}`);
  };

  const handleReportPost = async () => {
    const confirmed = window.confirm("이 게시글을 신고하시겠습니까?");
    if (!confirmed) return;
    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { reports: increment(1) });
      setReportCount(prev => prev + 1);
      alert("신고가 접수되었습니다.");
    } catch (err) {
      console.error("게시물 신고 실패:", err);
    }
  };

  if (!post) return <div className="text-center py-10">로딩 중...</div>;

  const totalVotes = post.options.reduce((sum, opt) => sum + opt.votes, 0);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h2 className="text-xl font-bold mb-2 text-center">{post.title}</h2>
      <p className="text-center text-sm text-gray-500">투표 마감: {remainingTime}</p>

      {post.options.map((opt, idx) => {
        const percentage = totalVotes ? Math.round((opt.votes / totalVotes) * 100) : 0;

        return (
          <div key={idx} className="border border-gray-300 rounded p-2 mb-4 transition">
            <div className="flex justify-between items-center mb-1 text-sm font-semibold">
              <span>{opt.text}</span>
              {voted && <span className="text-gray-500">{opt.votes}표 ({percentage}%)</span>}
            </div>

            {voted && (
              <div className="w-full bg-gray-200 rounded h-2 overflow-hidden mb-2">
                <div
                  className="bg-naver h-2 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            )}

            {!voted && (
              <button
                onClick={() => handleVote(idx)}
                className="w-full bg-naver hover:bg-naverDark text-white font-semibold text-sm py-1 rounded transition"
              >
                선택
              </button>
            )}
          </div>
        );
      })}

      {voted && (
        <div className="text-center mt-4 flex flex-wrap justify-center gap-4">
          <button
            onClick={cancelVote}
            className="text-sm text-red-500 underline"
          >
            투표 취소하기
          </button>
          <button
            onClick={handleReportPost}
            className="text-sm text-gray-500 underline"
          >
            게시글 신고하기 ({reportCount})
          </button>
        </div>
      )}

      <div className="text-center mt-10">
        <button
          onClick={() => {
            const url = window.location.href;
            const text = `[PoliTalk] ${post.title}`;
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(shareUrl, "_blank", "width=600,height=400");
          }}
          className="bg-naver hover:bg-naverDark text-white px-4 py-2 rounded text-sm font-semibold transition"
        >
          트위터로 공유하기
        </button>
      </div>
    </div>
  );
};

export default VoteSection;
