import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import toast, { Toaster } from "react-hot-toast";

import Home from "./components/pages/Home";
import VotePage from "./components/pages/VotePage";
import VotePageMobile from "./components/pages/VotePageMobile";
import CreateTopic from "./components/pages/CreateTopic";
import AdminPage from "./components/pages/AdminPage";
import AdminCommentsPage from "./components/pages/AdminCommentsPage";
import AdminUserPage from "./components/pages/AdminUserPage";
import MyProfilePage from "./components/pages/MyProfilePage";
import MyHistoryPage from "./components/pages/MyHistoryPage";
import LoginPage from "./components/pages/LoginPage";
import TermsPage from "./components/pages/TermsPage";
import PrivacyPolicy from "./components/pages/PrivacyPolicy";
import RulesPage from "./components/pages/RulesPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import NaverCallback from "./components/pages/NaverCallback";
import SetNickname from "./components/pages/SetNickname";

function AppWrapper() {
  const [user, setUser] = useState(null);
  const shownNotifications = useRef(
    new Set(JSON.parse(localStorage.getItem("shownNotifications") || "[]"))
  );
  const isMobile = window.innerWidth <= 768;
  const navigate = useNavigate(); // ✅ navigate 직접 사용
  const audioRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("receiverId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const id = change.doc.id;
        const data = change.doc.data();

        if (change.type === "added" && !shownNotifications.current.has(id)) {
          shownNotifications.current.add(id);
          localStorage.setItem(
            "shownNotifications",
            JSON.stringify(Array.from(shownNotifications.current))
          );

          const message =
            data.type === "reply"
              ? "내 댓글에 답글이 달렸습니다."
              : "내 게시글에 댓글이 달렸습니다.";

          if (audioRef.current) audioRef.current.play().catch(() => {});

          toast(`🔔 ${message}`, {
            icon: "📬",
            duration: 5000,
            position: "top-center",
            style: { cursor: "pointer" },
            onClick: () => {
              setTimeout(() => {
                if (data.postId && data.commentId) {
                  navigate(`/post/${data.postId}#comment-${data.commentId}`);
                } else if (data.postId) {
                  navigate(`/post/${data.postId}`);
                }
              }, 100); // 약간 지연 → SPA 라우팅 보장
            },
          });
        }
      });
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      <audio ref={audioRef} src="/ding.mp3" preload="auto" />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/post/:postId"
          element={isMobile ? <VotePageMobile /> : <VotePage />}
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-nickname" element={<SetNickname />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateTopic />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/comments"
          element={
            <AdminRoute>
              <AdminCommentsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUserPage />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MyProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/myhistory"
          element={
            <ProtectedRoute>
              <MyHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route path="/naver-callback" element={<NaverCallback />} />
      </Routes>

      <Toaster position="top-center" />
      <footer className="text-center text-sm text-gray-500 p-4">
        <a href="/terms" className="mr-4 underline hover:text-black">
          이용약관
        </a>
        <a href="/privacy" className="mr-4 underline hover:text-black">
          개인정보 처리방침
        </a>
        <a href="/rules" className="underline hover:text-black">
          커뮤니티 운영규칙
        </a>
      </footer>
    </>
  );
}



export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        <AppWrapper />
      </div>
    </Router>
  );
}
