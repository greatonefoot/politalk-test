// src/components/pages/SignupPage.jsx
import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SignupPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState("email"); // "email" or "password"
  const [processing, setProcessing] = useState(false);
  const [agreed, setAgreed] = useState(false); // ✅ 약관 동의 여부
  const navigate = useNavigate();

  // 로그인된 사용자라면 인증링크 없이 접근 못하도록 차단
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const isEmailLink = isSignInWithEmailLink(auth, window.location.href);
      if (user && !isEmailLink) {
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 이메일 인증 링크 클릭 시 → 비밀번호 설정 화면
  useEffect(() => {
    const url = window.location.href;
    const urlEmail = new URLSearchParams(window.location.search).get("email");
    const storedEmail = urlEmail || window.localStorage.getItem("emailForSignIn");

    if (isSignInWithEmailLink(auth, url) && storedEmail) {
      setEmail(storedEmail);
      setStep("password");
    }
  }, []);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) return alert("이메일을 입력해주세요.");
    if (!agreed) return alert("이용약관 및 개인정보 처리방침에 동의해주세요.");

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

  const handleSetPassword = async (e) => {
    e.preventDefault();
    if (!password) return alert("비밀번호를 입력해주세요.");
    setProcessing(true);

    try {
      const userCredential = await signInWithEmailLink(auth, email, window.location.href);
      const user = userCredential.user;

      await updatePassword(user, password); // ✅ 비밀번호 설정
      await updateProfile(user, { displayName: "새 사용자" });

     await setDoc(doc(db, "users", user.uid), {
  email,
  name: "새 사용자",
  profilePic: "https://firebasestorage.googleapis.com/v0/b/politalk-4e0dd.appspot.com/o/default-profile.png?alt=media",
  role: "user",
  createdAt: Date.now(),
});


      alert("회원가입이 완료되었습니다!");
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
          <form onSubmit={handleSendEmail} className="space-y-4">
            <input
              type="email"
              placeholder="이메일 입력"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded"
              required
            />

            <div className="flex items-start gap-2 text-sm text-gray-700">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="agree" className="leading-5">
                <a href="/terms" target="_blank" className="underline text-black">이용약관</a> 및{" "}
                <a href="/privacy" target="_blank" className="underline text-black">개인정보 처리방침</a>에 동의합니다.
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >
              인증 메일 보내기
            </button>
          </form>
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
      </div>
    </div>
  );
};

export default SignupPage;
