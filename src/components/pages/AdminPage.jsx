import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

const AdminPage = () => {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const querySnapshot = await getDocs(collection(db, "posts"));
      const postData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPosts(postData.sort((a, b) => (b.reports || 0) - (a.reports || 0)));
    };

    fetchPosts();
  }, []);

  const toggleFix = async (id, isFixed) => {
    await updateDoc(doc(db, "posts", id), {
      isFixed: !isFixed,
    });
    setPosts(prev =>
      prev.map(post => post.id === id ? { ...post, isFixed: !isFixed } : post)
    );
  };

  const deletePost = async (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "posts", id));
      setPosts(prev => prev.filter(post => post.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">🛠️ 관리자 페이지</h1>
      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="p-4 border rounded flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">{post.title}</h2>
              <p className="text-sm text-gray-500">{post.category}</p>
              <p className="text-sm text-red-500">🚨 신고 수: {post.reports || 0}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleFix(post.id, post.isFixed)}
                className={`px-3 py-1 rounded ${post.isFixed ? "bg-yellow-400" : "bg-gray-300"} text-sm`}
              >
                {post.isFixed ? "고정 해제" : "고정하기"}
              </button>
              <button
                onClick={() => deletePost(post.id)}
                className="px-3 py-1 rounded bg-red-400 text-white text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
