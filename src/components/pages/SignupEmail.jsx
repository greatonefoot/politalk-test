import React, { useState } from "react";
import { auth } from "../../firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const actionCodeSettings = {
  url: "https://politalk-test.vercel.app/signup-password",
  handleCodeInApp: true,
};

const SignupEmail = () => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSendLink = async (e) => {
    e.preventDefault();
    if (!email) return alert("이메일을 입력해주세요.");

    setSending(true);
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", email);
      alert("이메일 인증 링크를 보냈습니다. 메일을 확인해주세요.");
      navigate("/signup-password");
    } catch (error) {
      alert("오류: " + (error?.message || JSON.stringify(error)));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-sm w-full bg-white rounded shadow p-6 space-y-4">
        <h2 className="text-xl font-bold text-center">이메일 입력</h2>
        <form onSubmit={handleSendLink} className="space-y-3">
          <input
            type="email"
            placeholder="이메일 주소"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border w-full px-3 py-2 rounded"
            required
          />
          <button
            type="submit"
            className="bg-green-600 text-white w-full py-2 rounded"
            disabled={sending}
          >
            {sending ? "전송 중..." : "인증 메일 보내기"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignupEmail;
