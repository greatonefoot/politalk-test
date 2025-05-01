// src/components/HotPostsSidebar.jsx

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const HotPostsSidebar = () => {
  const [hotPosts, setHotPosts] = useState([]);

  useEffect(() => {
    const fetchHotPosts = async () => {
      const querySnapshot = await getDocs(collection(db, "posts"));
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sortedPosts = posts
        .sort((a, b) => ((b.views || 0) + (b.commentCount || 0)) - ((a.views || 0) + (a.commentCount || 0)))
        .slice(0, 5);

      setHotPosts(sortedPosts);
    };

    fetchHotPosts();
  }, []);

  return (
    <div className="w-52 bg-white shadow rounded p-4 h-fit max-h-[calc(100vh-250px)] overflow-y-auto">
      <h3 className="text-lg font-bold mb-4">🔥 실시간 인기글</h3>
      <ul className="space-y-2">
        {hotPosts.map(post => (
          <li key={post.id}>
            <Link
              to={`/post/${post.id}`}
              className="text-blue-600 hover:underline text-sm block truncate"
            >
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HotPostsSidebar;
