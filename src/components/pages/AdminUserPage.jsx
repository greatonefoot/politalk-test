import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions"; // ✅ Firebase Functions 호출용

const AdminUserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const functions = getFunctions(); // ✅ functions 인스턴스 생성
  const deleteAuthUser = httpsCallable(functions, "deleteAuthUser"); // ✅ 함수 지정

  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (uid, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u))
    );
  };

  const handleDeleteUser = async (uid) => {
    if (window.confirm("정말 이 사용자를 탈퇴시키겠습니까?")) {
      try {
        await deleteDoc(doc(db, "users", uid)); // ✅ Firestore에서 삭제
        await deleteAuthUser({ uid });          // ✅ Auth 계정도 삭제
        setUsers((prev) => prev.filter((u) => u.id !== uid));
      } catch (error) {
        console.error("삭제 실패:", error);
        alert("탈퇴 중 오류가 발생했습니다.");
      }
    }
  };

  if (loading)
    return <div className="text-center py-10">유저 목록 불러오는 중...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-6">👥 유저 관리</h2>
      <table className="w-full text-sm bg-white shadow rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">이메일</th>
            <th className="p-2 text-left">닉네임</th>
            <th className="p-2 text-left">등급</th>
            <th className="p-2 text-left">가입일</th>
            <th className="p-2 text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t">
              <td className="p-2">{user.email}</td>
              <td className="p-2">{user.name || "-"}</td>
              <td className="p-2">{user.role}</td>
              <td className="p-2">
                {user.createdAt?.toDate?.().toLocaleDateString?.() || "-"}
              </td>
              <td className="p-2 text-center space-x-2">
                <button
                  onClick={() => handleRoleChange(user.id, user.role)}
                  className="bg-naver text-white px-2 py-1 rounded text-sm"
                >
                  {user.role === "admin" ? "일반으로" : "관리자로"}
                </button>
                <button
                  onClick={() => handleDeleteUser(user.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded text-sm"
                >
                  강제탈퇴
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUserPage;
