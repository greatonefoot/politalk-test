import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const Home = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const postsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosts(postsData);
      } catch (error) {
        console.error("게시글 불러오기 실패:", error);
      }
    };

    fetchPosts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">🔥 최신 주제 목록</h1>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <p className="text-center text-gray-500">등록된 주제가 없습니다.</p>
        ) : (
          posts.map((post) => (
            <Link
              to={`/post/${post.id}`}
              key={post.id}
              className="block p-4 border rounded hover:bg-gray-50 transition"
            >
              <h2 className="text-xl font-semibold">{post.title}</h2>
              <p className="text-sm text-gray-600">{post.category}</p>
              <p className="text-sm text-gray-400">
                선택지 {post.options.length}개 · 댓글 {post.commentCount}개
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;
