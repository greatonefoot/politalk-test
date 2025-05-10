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
  query,
  where,
  getDocs
} from "firebase/firestore";

const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        if (!nickname.trim()) {
          alert("닉네임을 입력해주세요.");
          return;
        }
        if (!agreeTerms) {
          alert("약관에 동의해야 가입할 수 있습니다.");
          return;
        }

        // 닉네임 중복 검사
        const q = query(collection(db, "users"), where("name", "==", nickname));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert("이미 사용 중인 닉네임입니다.");
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);

        await setDoc(doc(db, "users", user.uid), {
          name: nickname,
          profilePic: "",
          email: email,
          role: "user",
          createdAt: new Date(),
        });

        alert("가입 완료! 이메일 인증 메일이 전송되었습니다.");
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (!user.emailVerified) {
          alert("이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.");
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            name: "새 사용자",
            profilePic: "",
            email: email,
            role: "user",
            createdAt: new Date(),
          });
        }

        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipRes.json();
        await addDoc(collection(db, "loginLogs"), {
          uid: user.uid,
          email: user.email,
          timestamp: new Date(),
          ip: ipData.ip,
        });

        alert("로그인 성공!");
        navigate("/");
      }
    } catch (error) {
      alert("오류: " + error.message);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      alert("이메일을 입력해주세요.");
      return;
    }
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
      if (!user.emailVerified) {
        alert("이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        await setDoc(userRef, {
          name: "새 사용자",
          profilePic: "",
          email: user.email,
          role: "user",
          createdAt: new Date(),
        });
      }

      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();
      await addDoc(collection(db, "loginLogs"), {
        uid: user.uid,
        email: user.email,
        timestamp: new Date(),
        ip: ipData.ip,
      });

      alert("구글 로그인 성공!");
      navigate("/");
    } catch (error) {
      alert("오류: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 relative">
      <Link to="/" className="absolute top-4 left-4 text-naver underline text-sm hover:text-naverDark">
        ← 홈으로
      </Link>

      <div className="max-w-sm w-full bg-white rounded p-6 shadow">
        <h2 className="text-xl font-bold mb-4 text-center">
          {isSignup ? "회원가입" : "로그인"}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-3 py-2 rounded"
            required
          />
          {isSignup && (
            <>
              <input
                type="text"
                placeholder="닉네임"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="border px-3 py-2 rounded"
                required
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>
                  <a href="/terms" className="underline text-blue-600" target="_blank">이용약관</a> 및
                  <a href="/privacy" className="underline text-blue-600" target="_blank"> 개인정보 처리방침</a>에 동의합니다
                </span>
              </label>
            </>
          )}
          <button type="submit" className="bg-naver text-white py-2 rounded">
            {isSignup ? "회원가입" : "로그인"}
          </button>
        </form>

        <div className="mt-4 flex justify-between text-sm">
          <button onClick={() => setIsSignup(!isSignup)} className="text-blue-600">
            {isSignup ? "로그인 하기" : "회원가입 하기"}
          </button>
          <button onClick={handleResetPassword} className="text-red-600">
            비밀번호 재설정
          </button>
        </div>

        <hr className="my-4" />

        <button onClick={handleGoogleLogin} className="bg-red-500 text-white w-full py-2 rounded mb-2">
          구글로 로그인
        </button>
      </div>
    </div>
  );
};

export default LoginPage;