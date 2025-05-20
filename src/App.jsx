import React, { useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "./firebase";
import toast, { Toaster } from "react-hot-toast";

import Home from "./components/pages/Home";
import VotePage from "./components/pages/VotePage";
import VotePageMobile from "./components/pages/VotePageMobile"; // ✅ 모바일 전용 페이지
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

// 👇 확인용 로그
console.log("✅ Home", typeof Home);
console.log("✅ VotePage", typeof VotePage);
console.log("✅ VotePageMobile", typeof VotePageMobile);
console.log("✅ CreateTopic", typeof CreateTopic);
console.log("✅ AdminPage", typeof AdminPage);
console.log("✅ AdminCommentsPage", typeof AdminCommentsPage);
console.log("✅ AdminUserPage", typeof AdminUserPage);
console.log("✅ MyProfilePage", typeof MyProfilePage);
console.log("✅ MyHistoryPage", typeof MyHistoryPage);
console.log("✅ LoginPage", typeof LoginPage);
console.log("✅ TermsPage", typeof TermsPage);
console.log("✅ PrivacyPolicy", typeof PrivacyPolicy);
console.log("✅ SetNickname", typeof SetNickname);
console.log("✅ RulesPage", typeof RulesPage);

function AppWrapper() {
  const [user, setUser] = useState(null);
  const isMobile = window.innerWidth <= 768;
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0); // ✅ 안 읽은 알림 개수 상태

  const shownIds = useRef(new Set());


  // ✅ 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

useEffect(() => {
  if (!user) return;

  console.log("👀 [알림] user 확인됨:", user.uid); // ✅ user 체크
    // ✅ 알림 개수 실시간 구독
  const q2 = query(
    collection(db, "notifications"),
    where("receiverId", "==", user.uid),
    where("read", "==", false)
  );

  const unsubscribe2 = onSnapshot(q2, (snapshot) => {
    setUnreadCount(snapshot.size); // ✅ 안 읽은 개수 저장
  });

  // ✅ 이 unsubscribe도 같이 리턴해야 함
  return () => unsubscribe2();


  const q = query(
    collection(db, "notifications"),
    where("receiverId", "==", user.uid),
    where("read", "==", false)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log("📡 [알림] 실시간 수신:", snapshot.size);

    snapshot.docChanges().forEach((change) => {
      console.log("🔄 [알림] 문서 변경:", change.type);

      if (change.type === "added") {
        const data = change.doc.data();
        const id = change.doc.id;

        console.log("✅ [알림] 새 알림 도착:", id, data);

        toast(`🔔 ${data.message || "새 알림이 도착했습니다."}`, {
          icon: "📬",
          duration: 5000,
          position: "top-center",
          style: { cursor: "pointer" },
        onClick: async () => {
  try {
    const notiRef = doc(db, "notifications", id); // 알림 문서 ID
    await updateDoc(notiRef, { read: true }); // ✅ 읽음 처리

    if (data.postId && data.commentId) {
      window.location.href = `/post/${data.postId}#comment-${data.commentId}`;
    } else if (data.postId) {
      window.location.href = `/post/${data.postId}`;
    }
  } catch (e) {
    console.error("알림 읽음 처리 실패:", e);
  }
          },
        });
      }
    });
  });

  return () => unsubscribe();
}, [user]);




  return (
    <>
        <div style={{ position: "absolute", top: 10, right: 10 }}>
      🔔 알림 {unreadCount > 0 ? `(${unreadCount})` : ""}
    </div>

      <Routes>
        {/* ✅ 홈, 게시글 보기: 공개 */}
        <Route path="/" element={<Home />} />
        <Route
          path="/post/:postId"
          element={isMobile ? <VotePageMobile /> : <VotePage />}
        />

        {/* ✅ 로그인 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/set-nickname" element={<SetNickname />} />

        {/* ✅ 약관 페이지 */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/rules" element={<RulesPage />} />

        {/* ✅ 글 작성: 로그인 필요 */}
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <CreateTopic />
            </ProtectedRoute>
          }
        />

        {/* ✅ 관리자 전용 */}
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

        {/* ✅ 마이페이지: 로그인 필요 */}
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
