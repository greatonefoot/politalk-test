import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";

const AdminCommentsPage = () => {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    const fetchReportedComments = async () => {
      const q = query(
        collection(db, "comments"),
        where("reports", ">", 0) // ✅ 신고 수 1개 이상인 댓글만 가져옴
      );
      const querySnapshot = await getDocs(q);
      const commentData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentData);
    };

    fetchReportedComments();
  }, []);

  const resetReports = async (commentId) => {
    await updateDoc(doc(db, "comments", commentId), {
      reports: 0, // ✅ 신고 수 0으로 초기화
    });
    setComments(prev =>
      prev.map(c => (c.id === commentId ? { ...c, reports: 0 } : c))
    );
  };

  const deleteComment = async (commentId) => {
    if (window.confirm("정말 이 댓글을 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "comments", commentId));
      setComments(prev => prev.filter(c => c.id !== commentId));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">🚨 신고 댓글 관리</h1>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500">신고된 댓글이 없습니다.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="p-4 border rounded flex justify-between items-center">
              <div>
                <p className="font-semibold">{comment.text}</p>
                <p className="text-sm text-gray-500">신고 수: {comment.reports}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resetReports(comment.id)}
                  className="px-3 py-1 rounded bg-green-400 text-white text-sm"
                >
                  신고 초기화
                </button>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="px-3 py-1 rounded bg-red-400 text-white text-sm"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCommentsPage;
