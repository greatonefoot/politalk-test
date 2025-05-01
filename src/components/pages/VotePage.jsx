// ✅ 최종 VotePage.jsx (투표 직후 댓글창 + 퍼센트 반영)
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../Header";
import VoteSection from "../VoteSection";
import CommentSection from "../CommentSection";
import HotPostsSidebar from "../HotPostsSidebar";
import { db } from "../../firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

const VotePage = () => {
  const { postId } = useParams();
  const [voted, setVoted] = useState(false);
  const [votedOption, setVotedOption] = useState(null);
  const [isDeadlinePassed, setDeadlinePassed] = useState(false);
  const [voteData, setVoteData] = useState(null);

  useEffect(() => {
    const checkVoted = () => {
      const votedOption = localStorage.getItem(`voted-${postId}`);
      if (votedOption !== null) {
        setVoted(true);
        setVotedOption(Number(votedOption));
      }
    };

    checkVoted();
    const interval = setInterval(checkVoted, 1000);
    return () => clearInterval(interval);
  }, [postId]);

  // ✅ 새로고침 없이 댓글창 + 퍼센트 반영되도록 voted 이벤트 감지
  useEffect(() => {
    const handleVoted = async () => {
      const votedOption = localStorage.getItem(`voted-${postId}`);
      if (votedOption !== null) {
        setVoted(true);
        setVotedOption(Number(votedOption));
      }

      // ✅ 최신 퍼센트 반영을 위해 데이터 재요청
      try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        if (snap.exists()) {
          setVoteData(snap.data());
        }
      } catch (err) {
        console.error("투표 데이터 새로고침 실패:", err);
      }
    };

    window.addEventListener("voted", handleVoted);
    return () => window.removeEventListener("voted", handleVoted);
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    const incrementViewCount = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        await updateDoc(postRef, {
          views: increment(1),
        });
      } catch (error) {
        console.error("조회수 증가 실패:", error);
      }
    };

    const fetchVoteData = async () => {
      try {
        const postRef = doc(db, "posts", postId);
        const snap = await getDoc(postRef);
        if (snap.exists()) {
          setVoteData(snap.data());
        }
      } catch (error) {
        console.error("투표 데이터 불러오기 실패:", error);
      }
    };

    incrementViewCount();
    fetchVoteData();
  }, [postId]);

  const getVotePercents = () => {
    if (!voteData?.options || voteData.options.length === 0) return [];

    const totalVotes = voteData.options.reduce((sum, opt) => sum + opt.votes, 0) || 1;
    return voteData.options.map(opt => (opt.votes / totalVotes) * 100);
  };

  const votePercents = getVotePercents();

  return (
    <div className="bg-gray-100 min-h-screen">
      <Header
        categories={[]}
        selectedCategory={"전체"}
        setSelectedCategory={() => {}}
        searchTerm=""
        setSearchTerm={() => {}}
      />

      <HotPostsSidebar />

      <main className="ml-[260px] pt-10 px-4">
        <div className="max-w-4xl mx-auto">
          <VoteSection postId={postId} setDeadlineState={setDeadlinePassed} />
        </div>

        {(voted || isDeadlinePassed) && Array.isArray(voteData?.options) ? (
          <div className="w-full max-w-6xl mx-auto mt-16 flex gap-4">
            {voteData.options.map((opt, idx) => (
              <CommentSection
                key={idx}
                postId={postId}
                optionIndex={idx}
                votePercent={votePercents[idx]}
                myVote={votedOption}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-12">
            투표 완료 후 댓글을 확인할 수 있습니다.
          </div>
        )}
      </main>
    </div>
  );
};

export default VotePage;