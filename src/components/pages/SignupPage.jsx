// src/components/pages/SignupPage.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email"); // "email" or "password"
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();

  // 로그인된 상태인데 이메일 링크가 아니면 → 홈으로
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isEmailLink = isSignInWithEmailLink(auth, window.location.href);
      if (user && !isEmailLink) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 이메일 인증 링크 클릭 시 → 비밀번호 입력 단계
  useEffect(() => {
    const url = window.location.href;
    const urlEmail = new URLSearchParams(window.location.search).get("email");
    const storedEmail = urlEmail || window.localStorage.getItem("emailForSignIn");

    if (isSignInWithEmailLink(auth, url) && storedEmail) {
      setEmail(storedEmail);
      setStep("password");
    }
  }, []);

  // 이메일 전송
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) return alert("이메일을 입력해주세요.");

    const actionCodeSettings = {
      url: `${window.location.origin}/signup?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      alert("인증 이메일을 보냈습니다. 메일함을 확인해주세요.");
    } catch (err) {
      alert("이메일 전송 오류: " + err.message);
    }
  };

  // 비밀번호 등록
  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!password) return alert("비밀번호를 입력해주세요.");
    setProcessing(true);

    try {
      await signInWithEmailLink(auth, email, window.location.href);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: "새 사용자" });

      await setDoc(doc(db, "users", user.uid), {
        email,
        name: "새 사용자",
        profilePic: "/default-profile.png",
        role: "user",
        createdAt: Date.now(),
      });

      navigate("/set-nickname");
    } catch (err) {
      alert("가입 오류: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl p-6 shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-4">회원가입</h1>

{step === "email" && (
  <>
    <form onSubmit={handleSendEmail} className="space-y-3">
      <input
        type="email"
        placeholder="이메일 입력"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        required
      />
      <button
        type="submit"
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        인증 메일 보내기
      </button>
    </form>

    {/* ✅ 안내 문구: 바로 form 아래에 위치 */}
    <p className="text-center text-sm text-gray-500 mt-4">
      PoliTalk은 <span className="font-semibold text-black">이메일과 닉네임만 수집</span>하며,<br />
      이름, 성별, 출생연도 등 <span className="text-red-500">개인정보는 수집하지 않습니다.</span>
    </p>
  </>
)}


        {step === "password" && (
          <form onSubmit={handleSetPassword} className="space-y-3">
            <p className="text-sm text-gray-600">인증된 이메일: {email}</p>
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={processing}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              {processing ? "처리 중..." : "회원가입 완료"}
            </button>
          </form>
        )}

        {step !== "email" && step !== "password" && (
          <p className="text-center text-gray-500 mt-4">잘못된 접근입니다. 다시 시도해주세요.</p>
        )}
      </div>
    </div>
  );
};

export default SignupPage;
