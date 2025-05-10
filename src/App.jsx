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
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

import { Toaster } from "react-hot-toast";

function App() {
  // ✅ 모바일 분기
  const isMobile = window.innerWidth <= 768;

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          {/* ✅ 홈, 게시글 보기: 공개 */}
          <Route path="/" element={<Home />} />
          <Route
            path="/post/:postId"
            element={isMobile ? <VotePageMobile /> : <VotePage />}
          />

          {/* ✅ 로그인 */}
          <Route path="/login" element={<LoginPage />} />

          {/* ✅ 약관 페이지 */}
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

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
        </Routes>

        <Toaster position="top-center" />
      </div>
    </Router>
  );
}

export default App;
