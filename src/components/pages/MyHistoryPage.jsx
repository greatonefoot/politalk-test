import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const MyHistoryPage = () => {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      const voteQuery = query(collection(db, "userVotes"), where("uid", "==", user.uid));
      const voteSnap = await getDocs(voteQuery);

      const voteData = await Promise.all(
        voteSnap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const postRef = doc(db, "posts", data.postId);
          const postSnap = await getDoc(postRef);
          const postTitle = postSnap.exists() ? postSnap.data().title : "(삭제된 게시물)";
          return {
            id: docSnap.id,
            postId: data.postId,
            choice: data.choice,
            title: postTitle,
            votedAt: data.votedAt?.toDate?.().toLocaleString?.() || "시간 없음",
          };
        })
      );

      setVotes(voteData);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) return <div className="text-center py-10">불러오는 중...</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">📊 내가 투표한 내역</h1>
      {votes.length === 0 ? (
        <p className="text-gray-500">아직 투표한 내역이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {votes.map(vote => (
            <li key={vote.id} className="bg-white p-4 rounded shadow-sm">
              <div className="font-semibold text-lg">{vote.title}</div>
              <div className="text-sm text-gray-600 mt-1">
                선택: <span className="font-bold text-naver">{vote.choice}</span> | 시간: {vote.votedAt}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyHistoryPage;
