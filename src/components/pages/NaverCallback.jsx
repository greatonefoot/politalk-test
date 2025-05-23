// src/pages/NaverCallback.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NaverCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (code) {
     fetch(
  `https://politalk-4e0dd.web.app/naverLogin?code=${code}&state=${state}`
)


        .then((res) => res.json())
        .then(async ({ customToken }) => {
          if (customToken) {
            const { getAuth, signInWithCustomToken } = await import("firebase/auth");
            const auth = getAuth();
            await signInWithCustomToken(auth, customToken);
            navigate("/");
          }
        })
        .catch((err) => {
          console.error("네이버 로그인 실패:", err);
          alert("네이버 로그인 실패");
        });
    }
  }, [navigate]);

  return <div className="text-center mt-20">네이버 로그인 처리 중...</div>;
};

export default NaverCallback;
