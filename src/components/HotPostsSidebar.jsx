// ✅ 최종 HotPostsSidebar.jsx - 네이버 스타일 + 고정글 상단 표시 + 작게 + 좌측 상단 절대 위치 (스크롤 따라가지 않음)
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";

const HotPostsSidebar = () => {
  const [hotPosts, setHotPosts] = useState([]);
  const [activeTab, setActiveTab] = useState("일간");

  useEffect(() => {
    const fetchHotPosts = async () => {
      try {
        const postsSnapshot = await getDocs(collection(db, "posts"));
        const posts = postsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const now = new Date();
        const dateLimit = new Date(
          activeTab === "일간"
            ? now.setDate(now.getDate() - 1)
            : activeTab === "주간"
            ? now.setDate(now.getDate() - 7)
            : now.setDate(now.getDate() - 30)
        );

        const recentPosts = posts.filter(post => {
          const createdAt = post.createdAt?.toDate?.();
          return createdAt && createdAt >= dateLimit;
        });

        const postsWithCommentCounts = await Promise.all(
          recentPosts.map(async post => {
            const commentsSnapshot = await getDocs(
              query(collection(db, "comments"), where("postId", "==", post.id))
            );
            return {
              ...post,
              realCommentCount: commentsSnapshot.size,
            };
          })
        );

        const fixedPosts = postsWithCommentCounts.filter(p => p.isFixed);
        const nonFixedPosts = postsWithCommentCounts.filter(p => !p.isFixed);

        const sorted = nonFixedPosts
          .sort((a, b) => ((b.views || 0) + (b.realCommentCount || 0) * 3) - ((a.views || 0) + (a.realCommentCount || 0) * 3))
          .slice(0, 5 - fixedPosts.length);

        setHotPosts([...fixedPosts, ...sorted]);
      } catch (error) {
        console.error("🔥 인기글 불러오기 실패:", error);
      }
    };

    fetchHotPosts();
  }, [activeTab]);

  return (
    <div
      className="absolute top-24 left-4 w-56 bg-white shadow rounded border border-naver p-3"
      style={{ height: "300px", overflowY: "auto" }}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-naver font-bold text-sm">🔥 인기글</h3>
        <div className="flex gap-1 text-xs">
          {['일간', '주간', '월간'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded-full border text-xs ${activeTab === tab ? 'bg-naver text-white' : 'border-naver text-naver'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        {hotPosts.map((post) => (
          <li key={post.id}>
            <Link
              to={`/post/${post.id}`}
              className="flex justify-between items-center text-xs hover:underline text-gray-700"
            >
              <span className="truncate max-w-[110px]">
                {post.title}
                {post.isFixed && <span className="ml-1 text-red-500">📌</span>}
              </span>
              <span className="text-gray-400 text-[10px]">[{post.realCommentCount}]</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HotPostsSidebar;
