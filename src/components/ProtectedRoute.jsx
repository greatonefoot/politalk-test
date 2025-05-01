// src/components/ProtectedRoute.jsx
import React, { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { Navigate } from "react-router-dom";
import { auth } from "../firebase";
import { sendEmailVerification } from "firebase/auth";

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <div className="text-center py-10">로딩 중...</div>;

  if (!user) return <Navigate to="/login" />;

  if (!user.emailVerified) {
    const handleResend = async () => {
      try {
        await sendEmailVerification(user);
        setResent(true);
      } catch (err) {
        setError("인증 메일 전송 실패: " + err.message);
      }
    };

    return (
      <div className="text-center py-20 px-4">
        <p className="text-xl text-red-600 font-bold mb-4">
          이메일 인증이 필요합니다.
        </p>
        <p className="text-gray-700 mb-6">
          받은 편지함에서 인증 링크를 클릭한 뒤 새로고침해주세요.
        </p>
        <button
          onClick={handleResend}
          disabled={resent}
          className={`px-4 py-2 rounded text-white ${
            resent ? "bg-gray-400" : "bg-naver hover:bg-naverDark"
          }`}
        >
          {resent ? "✅ 인증 메일 재전송 완료" : "📧 인증 메일 다시 보내기"}
        </button>
        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
