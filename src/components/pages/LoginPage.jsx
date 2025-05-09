import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithCustomToken,
} from "firebase/auth";
import { doc, setDoc, addDoc, collection, getDoc } from "firebase/firestore";

const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const kakaoKey = "efee2a0af2ad649dea067b07b6f48b10";

    // Kakao SDK
    const kakaoScript = document.createElement("script");
    kakaoScript.src = "https://developers.kakao.com/sdk/js/kakao.js";
    kakaoScript.async = true;
    kakaoScript.defer = true;
    kakaoScript.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(kakaoKey);
        console.log("✅ Kakao SDK 초기화 완료");
      }
    };
    document.head.appendChild(kakaoScript);

    // Naver SDK
    const naverScript = document.createElement("script");
    naverScript.src = "https://static.nid.naver.com/js/naveridlogin_js_sdk_2.0.2.js";
    naverScript.async = true;
    document.head.appendChild(naverScript);

    naverScript.onload = () => {
      const naverLogin = new window.naver.LoginWithNaverId({
        clientId: "KzNqOG3o5fJpv3t2qJ4k", // 네이버 콘솔에서 받은 Client ID
        callbackUrl: "https://politalk-test.vercel.app/login",
        isPopup: truth,
        loginButton: { color: "green", type: 3, height: 40 },
      });
      naverLogin.init();
    };
  }, []);

  useEffect(() => {
    const hash = window.location.href.split("#")[1];
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");

      const handleNaverLogin = async () => {
        try {
          const res = await fetch("https://asia-northeast3-politalk-4e0dd.cloudfunctions.net/naverLogin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });

          const data = await res.json();
          await signInWithCustomToken(auth, data.firebaseToken);
          alert("네이버 로그인 성공!");
          navigate("/");
        } catch (error) {
          alert("네이버 로그인 실패: " + error.message);
        }
      };

      handleNaverLogin();
    }
  }, [navigate]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isSignup) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
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

  const handleKakaoLogin = async () => {
    try {
      if (!window.Kakao || !window.Kakao.isInitialized()) {
        alert("카카오 SDK가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      window.Kakao.Auth.login({
        scope: "profile_nickname, account_email",
        persistAccessToken: true,
        success: async (authObj) => {
          const res = await fetch("https://naverlogin-wbm25judka-du.a.run.app", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken }),
          });
          
          const data = await res.json();
          await signInWithCustomToken(auth, data.firebaseToken);
          alert("카카오 로그인 성공!");
          navigate("/");
        },
        fail: (err) => {
          console.error("카카오 로그인 실패", err);
          alert("카카오 로그인 실패");
        },
      });
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
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border px-3 py-2 rounded"
          />
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
        <button onClick={handleKakaoLogin} className="bg-yellow-400 text-black w-full py-2 rounded mb-2">
          카카오로 로그인
        </button>

        {/* ✅ 네이버 로그인 버튼 영역 */}
        <div id="naverIdLogin" className="w-full flex justify-center my-2" />
      </div>
    </div>
  );
};

export default LoginPage;
