import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCustomToken,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  getDoc,
} from "firebase/firestore";

const NAVER_CLIENT_ID = "KzNqOG3o5fJpv3t2qJ4k";
const NAVER_CALLBACK_URL = "https://politalk-test.vercel.app/naver-callback";
const naverState = Math.random().toString(36).substring(2);
const naverLoginUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(NAVER_CALLBACK_URL)}&state=${naverState}`;

const KAKAO_API_KEY = "d840e4500f1ad3fa24e6380c2a8ad8b9";
const KAKAO_FUNCTION_URL = "https://us-central1-politalk-4e0dd.cloudfunctions.net/kakaoLogin";

const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://developers.kakao.com/sdk/js/kakao.js";
    script.async = true;
    script.onload = () => {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_API_KEY);
      }
    };
    document.body.appendChild(script);
  }, []);

  const formatPhoneNumber = (number) => {
    const cleaned = number.replace(/[^0-9]/g, "");
    if (cleaned.startsWith("0")) return "+82" + cleaned.slice(1);
    if (cleaned.startsWith("82")) return "+" + cleaned;
    return number;
  };

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => alert("reCAPTCHA 만료. 다시 시도해주세요."),
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        if (!agreeTerms) return alert("약관에 동의해야 가입할 수 있습니다.");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        await setDoc(doc(db, "users", user.uid), {
          name: "새 사용자",
          profilePic: "",
          email,
          role: "user",
          createdAt: new Date(),
        });
        alert("가입 완료! 이메일 인증 후 닉네임을 설정해주세요.");
        navigate("/set-nickname");
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (!user.emailVerified) return alert("이메일 인증이 필요합니다.");
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: "새 사용자",
            profilePic: "",
            email,
            role: "user",
            createdAt: new Date(),
          });
          return navigate("/set-nickname");
        } else if (docSnap.data().name === "새 사용자") {
          return navigate("/set-nickname");
        }
        const ip = (await (await fetch("https://api.ipify.org?format=json")).json()).ip;
        await addDoc(collection(db, "loginLogs"), {
          uid: user.uid,
          email: user.email,
          timestamp: new Date(),
          ip,
        });
        alert("로그인 성공!");
        navigate("/");
      }
    } catch (error) {
      alert("오류: " + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return alert("이메일을 입력해주세요.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("비밀번호 재설정 링크를 보냈습니다.");
    } catch (error) {
      alert("오류: " + error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists() || docSnap.data().name === "새 사용자") {
        await setDoc(userRef, {
          name: "새 사용자",
          profilePic: "",
          email: user.email,
          role: "user",
          createdAt: new Date(),
        });
        return navigate("/set-nickname");
      }
      alert("구글 로그인 성공!");
      navigate("/");
    } catch (error) {
      alert("오류: " + error.message);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      await window.Kakao.Auth.login({
        scope: "profile_nickname,account_email",
        success: async (authObj) => {
          const res = await fetch(KAKAO_FUNCTION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: authObj.access_token }),
          });
          const data = await res.json();
          if (!data.token) throw new Error("커스텀 토큰 없음");

          const result = await signInWithCustomToken(auth, data.token);
          const user = result.user;
          const userRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(userRef);
          if (!docSnap.exists() || docSnap.data().name === "새 사용자") {
            await setDoc(userRef, {
              name: "새 사용자",
              profilePic: "",
              email: user.email || "",
              role: "user",
              createdAt: new Date(),
            });
            return navigate("/set-nickname");
          }
          alert("카카오 로그인 성공!");
          navigate("/");
        },
        fail: (err) => {
          console.error(err);
          alert("카카오 로그인 실패");
        },
      });
    } catch (err) {
      console.error(err);
      alert("카카오 로그인 오류 발생");
    }
  };

  const handleSendCode = async () => {
    if (!phoneNumber) return alert("전화번호를 입력해주세요!");
    setupRecaptcha();
    const formatted = formatPhoneNumber(phoneNumber);
    try {
      const confirmation = await signInWithPhoneNumber(auth, formatted, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      alert("인증번호가 전송되었습니다.");
    } catch (error) {
      alert("전송 실패: " + error.message);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !confirmationResult) return alert("인증번호를 입력해주세요.");
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists() || docSnap.data().name === "새 사용자") {
        await setDoc(userRef, {
          name: "새 사용자",
          profilePic: "",
          email: user.email || "",
          role: "user",
          createdAt: new Date(),
        });
        return navigate("/set-nickname");
      }
      alert("로그인 성공!");
      navigate("/");
    } catch (error) {
      alert("코드 인증 실패: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative px-4">
      <Link to="/" className="absolute top-4 left-4 text-naver underline text-sm hover:text-naverDark">← 홈으로</Link>

      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-md space-y-6">
        <h2 className="text-xl font-bold text-center">{isSignup ? "회원가입" : "로그인"}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" required />
          <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border px-3 py-2 rounded" required />
          {isSignup && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
              <span>
                <a href="/terms" target="_blank" className="underline text-blue-600">이용약관</a> 및{" "}
                <a href="/privacy" target="_blank" className="underline text-blue-600">개인정보 처리방침</a>에 동의합니다
              </span>
            </label>
          )}
          <button type="submit" className="bg-naver text-white w-full py-2 rounded">
            {isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        <div className="flex justify-between text-sm">
          <button onClick={() => setIsSignup(!isSignup)} className="text-blue-600">
            {isSignup ? "로그인 하기" : "회원가입 하기"}
          </button>
          <button onClick={handleResetPassword} className="text-red-600">
            비밀번호 재설정
          </button>
        </div>

        <hr />

        <div className="text-sm text-center text-gray-500">
          ※ 간편 로그인 및 전화번호 로그인은 <span className="text-red-500 font-semibold">자동 회원가입</span>이 진행됩니다
        </div>

      <div className="flex flex-col items-center gap-2 mt-2 w-full">
  <button
    onClick={handleGoogleLogin}
    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border bg-white text-black text-sm w-[220px] hover:bg-gray-50"
  >
<img
  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
  alt="Google"
  className="w-5 h-5"
/>

    구글 로그인
  </button>

  <button
    onClick={handleKakaoLogin}
    className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border bg-[#FEE500] text-black text-sm w-[220px] hover:brightness-105"
  >
    <img
  src="https://developers.kakao.com/assets/img/about/logos/kakaolink/kakaolink_btn_small.png"
  alt="Kakao"
  className="w-5 h-5"
/>

    카카오 로그인
  </button>

  <a href={naverLoginUrl} className="block w-[220px]">
    <button
      className="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-md border bg-[#03C75A] text-white text-sm hover:brightness-110"
    >
<img
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Naver_icon.svg/512px-Naver_icon.svg.png"
  alt="Naver"
  className="w-5 h-5"
/>



      네이버 로그인
    </button>
  </a>
</div>


        <div className="border-t pt-4 mt-4 space-y-2">
          <button onClick={() => setShowPhoneLogin(!showPhoneLogin)} className="w-full bg-gray-100 text-black py-2 rounded border">
            📱 전화번호 로그인 {showPhoneLogin ? "▲" : "▼"}
          </button>

          {showPhoneLogin && (
            <>
              <input type="tel" placeholder="01012345678 (숫자만)" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full border px-3 py-2 rounded" />
              <button onClick={handleSendCode} className="bg-blue-500 text-white py-2 rounded w-full">인증 코드 보내기</button>

              {confirmationResult && (
                <>
                  <input type="text" placeholder="인증번호 입력" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="w-full border px-3 py-2 rounded" />
                  <button onClick={handleVerifyCode} className="bg-green-600 text-white py-2 rounded w-full">로그인</button>
                </>
              )}
              <div id="recaptcha-container"></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
