import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// 🔒 관리자 UID 설정
const ADMIN_UID = "ZxYbiBdcAEXCaUvpzqZvo4ZwlQi1";

const AdminCommentsPage = () => {
  const [comments, setComments] = useState([]);
  const navigate = useNavigate();

  // 🔐 관리자 인증
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user.uid !== ADMIN_UID) {
        alert("접근 권한이 없습니다.");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 🚨 신고 댓글 불러오기
  useEffect(() => {
    const fetchReportedComments = async () => {
      const q = query(
        collection(db, "comments"),
        where("reportCount", ">", 0) // ✅ reportCount 기준
      );
      const querySnapshot = await getDocs(q);
      const commentData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentData);
    };

    fetchReportedComments();
  }, []);

  // 🧯 신고 초기화 + 블라인드 해제
  const resetReports = async (commentId) => {
    await updateDoc(doc(db, "comments", commentId), {
      reportCount: 0,
      isBlind: false,
    });
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, reportCount: 0, isBlind: false }
          : c
      )
    );
  };

  // 🗑 댓글 삭제
  const deleteComment = async (commentId) => {
    if (window.confirm("정말 이 댓글을 삭제하시겠습니까?")) {
      await deleteDoc(doc(db, "comments", commentId));
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        🚨 신고 댓글 관리
      </h1>
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-center text-gray-500">신고된 댓글이 없습니다.</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="p-4 border rounded flex justify-between items-center"
            >
              <div>
                <p className="font-semibold break-words max-w-xl">{comment.text}</p>
                <p className="text-sm text-gray-500">
                  신고 수: {comment.reportCount}
                  {comment.isBlind && (
                    <span className="ml-2 text-red-500 font-semibold">
                      (블라인드됨)
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => resetReports(comment.id)}
                  className="px-3 py-1 rounded bg-green-500 text-white text-sm"
                >
                  신고 초기화
                </button>
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="px-3 py-1 rounded bg-red-500 text-white text-sm"
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
