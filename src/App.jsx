import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

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




import { Toaster } from "react-hot-toast";

// 👇 이 줄들 복사해서 붙여넣어
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


function App() {
  // ✅ 모바일 분기
  const isMobile = window.innerWidth <= 768;

  return (
    <Router>
      <div className="min-h-screen bg-white">
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
  <a href="/terms" className="mr-4 underline hover:text-black">이용약관</a>
  <a href="/privacy" className="mr-4 underline hover:text-black">개인정보 처리방침</a>
  <a href="/rules" className="underline hover:text-black">커뮤니티 운영규칙</a>
</footer>
      </div>
    </Router>
  );
}

export default App;
