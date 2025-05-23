import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  doc,
  setDoc,
  addDoc,
  collection,
  getDoc,
} from "firebase/firestore";

const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative px-4">
      <Link to="/" className="absolute top-4 left-4 text-naver underline text-sm hover:text-naverDark">
        ← 홈으로
      </Link>

      <div className="w-full max-w-md bg-white rounded-xl p-6 shadow-md space-y-6">
        <h2 className="text-xl font-bold text-center">{isSignup ? "회원가입" : "로그인"}</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            required
          />
          {isSignup && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
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
        </div>

        <p className="text-center text-sm text-gray-500 mt-2">
          PoliTalk은 <span className="font-semibold text-black">이메일과 닉네임만 수집</span>하며,<br />
          이름, 성별, 출생연도 등 <span className="text-red-500">개인정보는 수집하지 않습니다.</span><br />
          자유롭고 안전한 <span className="font-semibold">익명 토론</span>을 보장합니다.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
