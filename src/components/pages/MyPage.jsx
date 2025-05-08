import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

const MyProfilePage = () => {
  const [user, setUser] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [commentPostTitles, setCommentPostTitles] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }
      setUser(currentUser);
      await fetchMyContent(currentUser.uid);
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchMyContent = async (uid) => {
    const postsSnap = await getDocs(query(collection(db, "posts"), where("authorUid", "==", uid)));
    const commentsSnap = await getDocs(query(collection(db, "comments"), where("authorUid", "==", uid)));

    const comments = commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const titlesMap = {};

    // 댓글에 달린 글 제목도 가져오기
    await Promise.all(
      comments.map(async (comment) => {
        if (!titlesMap[comment.postId]) {
          const postDoc = await getDoc(doc(db, "posts", comment.postId));
          titlesMap[comment.postId] = postDoc.exists() ? postDoc.data().title : "삭제된 글";
        }
      })
    );

    setMyPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setMyComments(comments);
    setCommentPostTitles(titlesMap);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">📁 마이페이지</h1>

      {user && (
        <div className="mb-6 text-sm">
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
            <div key={post.id} className="border-b py-2 text-sm">
              <Link to={`/post/${post.id}`} className="text-blue-600 hover:underline">
                {post.title}
              </Link>{" "}
              <span className="text-gray-500">({post.views || 0} 조회)</span>
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
              <p className="mb-1">💬 {comment.text}</p>
              <p className="text-xs text-gray-500">
                ↪ 글: {commentPostTitles[comment.postId] || "알 수 없음"}
              </p>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

export default MyProfilePage;
