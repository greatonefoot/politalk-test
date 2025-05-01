import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const MyPage = () => {
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      setUser(currentUser);
      fetchMyContent(currentUser.uid);
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchMyContent = async (uid) => {
    const postsSnap = await getDocs(query(collection(db, "posts"), where("uid", "==", uid)));
    const commentsSnap = await getDocs(query(collection(db, "comments"), where("uid", "==", uid)));

    setMyPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setMyComments(commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">📁 마이페이지</h1>

      {user && (
        <div className="mb-6">
          <p><strong>이메일:</strong> {user.email}</p>
          <p><strong>UID:</strong> {user.uid}</p>
        </div>
      )}

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">📝 내가 쓴 글</h2>
        {myPosts.length === 0 ? (
          <p className="text-gray-500">작성한 글이 없습니다.</p>
        ) : (
          myPosts.map(post => (
            <div key={post.id} className="border-b py-2">
              <strong>{post.title}</strong> <span className="text-sm text-gray-500">조회수 {post.views || 0}</span>
            </div>
          ))
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">💬 내가 쓴 댓글</h2>
        {myComments.length === 0 ? (
          <p className="text-gray-500">작성한 댓글이 없습니다.</p>
        ) : (
          myComments.map(comment => (
            <div key={comment.id} className="border-b py-2 text-sm text-gray-700">
              {comment.text}
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default MyPage;
