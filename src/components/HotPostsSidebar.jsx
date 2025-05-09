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
    
        // 🔥 삭제된 게시물 제외
        const nonDeletedPosts = posts.filter(post => !post.isDeleted);
    
        const now = new Date();
        const dateLimit = new Date(
          activeTab === "일간"
            ? now.setDate(now.getDate() - 1)
            : activeTab === "주간"
            ? now.setDate(now.getDate() - 7)
            : now.setDate(now.getDate() - 30)
        );
    
        const recentPosts = nonDeletedPosts.filter(post => {
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
    
        const maxCount = 10;
        const remainingCount = Math.max(0, maxCount - fixedPosts.length);
    
        const sorted = nonFixedPosts
          .sort((a, b) =>
            ((b.views || 0) + (b.realCommentCount || 0) * 3) -
            ((a.views || 0) + (a.realCommentCount || 0) * 3)
          )
          .slice(0, remainingCount);
    
        setHotPosts([...fixedPosts, ...sorted]);
      } catch (error) {
        console.error("🔥 인기글 불러오기 실패:", error);
      }
    };
    

    fetchHotPosts();
  }, [activeTab]);

  return (
    <div className="absolute top-24 left-4 w-56 z-10 hidden lg:block pointer-events-auto">
      <div
        className="bg-white shadow rounded border p-3"
        style={{
          height: "300px",
          overflowY: "auto",
          borderColor: "#4B3621", // 갈색 테두리
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-[#4B3621] font-bold text-sm">🔥 인기글</h3>
          <div className="flex gap-1 text-xs">
            {["일간", "주간", "월간"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded-full border text-xs ${
                  activeTab === tab
                    ? "text-white"
                    : "border-[#4B3621] text-[#4B3621]"
                }`}
                style={{
                  backgroundColor: activeTab === tab ? "#4B3621" : "white",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2">
          {hotPosts.map(post => (
            <li key={post.id}>
              <Link
                to={`/post/${post.id}`}
                className="flex justify-between items-center text-xs hover:underline text-gray-700"
              >
                <span className="truncate max-w-[110px]">
                  {post.title}
                  {post.isFixed && <span className="ml-1 text-red-500">📌</span>}
                </span>
                <span className="text-gray-400 text-[10px]">
                  [{post.realCommentCount}]
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default HotPostsSidebar;
