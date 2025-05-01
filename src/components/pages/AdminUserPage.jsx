// ✅ src/components/pages/AdminUserPage.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

const AdminUserPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
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

  if (loading) return <div className="text-center py-10">유저 목록 불러오는 중...</div>;

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
            <th className="p-2">권한 변경</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t">
              <td className="p-2">{user.email}</td>
              <td className="p-2">{user.name || "-"}</td>
              <td className="p-2">{user.role}</td>
              <td className="p-2">{user.createdAt?.toDate?.().toLocaleDateString?.() || "-"}</td>
              <td className="p-2 text-center">
                <button
                  onClick={() => handleRoleChange(user.id, user.role)}
                  className="bg-naver text-white px-3 py-1 rounded text-sm"
                >
                  {user.role === "admin" ? "일반으로" : "관리자로"}
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
