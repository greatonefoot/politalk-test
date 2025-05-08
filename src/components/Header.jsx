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
  const [profilePic, setProfilePic] = useState("");

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user?.uid && user.emailVerified) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRole(data.role);
          setProfilePic(data.profilePic || "");
        }
      }
    };
    fetchUserInfo();
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
        {/* ✅ 로고 - 하얀색 박스 안 PoliTalk */}
        <Link
          to="/"
          onClick={handleLogoClick}
          className="bg-white text-naver text-2xl font-bold px-3 py-1 rounded"
        >
          PoliTalk
        </Link>

        {/* 🔍 검색창 */}
        <div className="flex w-full max-w-lg items-center mx-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="w-full px-3 py-2 rounded text-black sm:w-3/4"
          />
        </div>

        {/* 👤 유저 메뉴 */}
        <div className="ml-4 flex items-center gap-3">
          {user && user.emailVerified ? (
            <>
              {/* ✅ 프로필 이미지 */}
              <Link to="/profile">
                <img
                  src={profilePic || "https://via.placeholder.com/32"}
                  alt="프로필"
                  className="w-8 h-8 rounded-full object-cover border border-white"
                />
              </Link>
              <Link
                to="/profile"
                className="text-white font-medium underline text-sm hidden sm:block"
              >
                마이페이지
              </Link>

              {/* 🔧 관리자 메뉴 */}
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

              {/* 📧 이메일 & 관리자 여부 표시 */}
              <span className="text-sm">
                {user.email}
                {role === "admin" && (
                  <span className="text-red-300 font-bold ml-1">[관리자]</span>
                )}
              </span>

              {/* 🔓 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="bg-white text-naver font-bold px-3 py-1 rounded text-sm"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login">
              <div className="bg-white text-naver font-bold px-4 py-2 rounded text-sm">
                로그인
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* 🏷 카테고리 바 */}
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
