import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { createUserWithEmailAndPassword, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SignupPassword = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedEmail = window.localStorage.getItem("emailForSignIn");
    if (isSignInWithEmailLink(auth, window.location.href) && storedEmail) {
      signInWithEmailLink(auth, storedEmail, window.location.href)
        .then(() => {
          setEmail(storedEmail);
        })
        .catch((error) => {
          alert("이메일 인증 실패: " + error.message);
        });
    } else {
      alert("잘못된 접근입니다. 이메일 인증부터 진행해주세요.");
      navigate("/signup-email");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return alert("비밀번호를 입력해주세요.");
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", result.user.uid), {
        email,
        name: "새 사용자",
        profilePic: "",
        role: "user",
        createdAt: new Date(),
      });
      alert("비밀번호 설정 완료! 닉네임을 설정해주세요.");
      navigate("/set-nickname");
    } catch (error) {
      alert("회원가입 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-sm w-full bg-white rounded shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-center">비밀번호 설정</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border w-full px-3 py-2 rounded"
            required
          />
          <button type="submit" className="bg-green-600 text-white w-full py-2 rounded">
            가입 완료
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupPassword;
