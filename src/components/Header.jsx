// ✅ src/components/Header.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

function Header({
  categories = [],
  selectedCategory,
  setSelectedCategory,
  searchTerm = "",
  setSearchTerm = () => {},
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user?.emailVerified) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setRole(docSnap.data().role);
        }
      }
    };
    fetchUserRole();
  }, [user]);

  const handleLogoClick = (e) => {
    if (location.pathname === "/") {
      e.preventDefault();
      window.location.reload();
    } else {
      navigate("/");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <header className="bg-naver text-white">
      <div className="flex justify-between items-center px-4 py-3 max-w-7xl mx-auto">
        {/* ✅ 로고 */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="text-2xl font-bold text-white"
        >
          PoliTalk
        </Link>

        {/* 검색창 */}
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-1/2 px-3 py-2 rounded text-black"
        />

        {/* 로그인 / 로그아웃 상태 구분 */}
        <div className="ml-4">
          {user && user.emailVerified ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className="text-white font-medium underline text-sm"
              >
                마이페이지
              </Link>
              {role === "admin" && (
                <>
                  <Link
                    to="/admin"
                    className="text-xs bg-white text-naver px-2 py-1 rounded font-bold hover:bg-gray-100"
                  >
                    게시물 관리
                  </Link>
                  <Link
                    to="/admin/comments"
                    className="text-xs bg-white text-naver px-2 py-1 rounded font-bold hover:bg-gray-100"
                  >
                    댓글 관리
                  </Link>
                  <Link
                    to="/admin/users"
                    className="text-xs bg-white text-naver px-2 py-1 rounded font-bold hover:bg-gray-100"
                  >
                    유저 관리
                  </Link>
                </>
              )}
              <span className="text-sm">
                {user.email} {role === "admin" && <span className="text-red-300 font-bold ml-1">[관리자]</span>}
              </span>
              <button
                onClick={handleLogout}
                className="bg-white text-naver font-bold px-3 py-1 rounded text-sm"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <Link to="/login">
              <div className="bg-white text-naver font-bold px-4 py-2 rounded text-sm">
                로그인
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* 카테고리 바 */}
      <div className="flex flex-wrap gap-2 px-4 pb-3 max-w-7xl mx-auto text-sm">
        {Array.isArray(categories) &&
          categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full border ${
                selectedCategory === cat
                  ? "bg-white text-naver font-bold"
                  : "border-white text-white"
              }`}
            >
              {cat}
            </button>
          ))}
      </div>
    </header>
  );
}

export default Header;
