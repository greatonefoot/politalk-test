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
  const [userInfo, setUserInfo] = useState(null);
  const [profilePic, setProfilePic] = useState("");

 useEffect(() => {
  const fetchUserInfo = async () => {
    if (user?.uid) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRole(data.role);
        setProfilePic(data.profilePic || "");
        setUserInfo(data); 
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
    <header className="bg-white border-b-8 border-[#6B4D33] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 max-w-7xl mx-auto">
        {/* ✅ 로고 - 하얀색 박스 안 PoliTalk */}
<Link
  to="/"
  onClick={handleLogoClick}
  className="text-3xl font-extrabold text-[#6B4D33] px-4 py-2 whitespace-nowrap"
>
  PoliTalk
</Link>




{/* 🔍 검색창 */}
<div className="flex-1 flex justify-center">
  <div className="flex w-full max-w-sm border border-[#6B4D33] rounded overflow-hidden">
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="검색어를 입력하세요"
      className="flex-1 px-3 py-2 text-sm text-black focus:outline-none"
    />
    <button className="bg-[#6B4D33] px-3 text-white text-lg">
      🔍
    </button>
  </div>
</div>



        {/* 👤 유저 메뉴 */}
        <div className="ml-4 flex items-center gap-3">
          {user ? (
            <>
              {/* ✅ 프로필 이미지 */}
              <Link to="/profile">
                <img
                  src={profilePic || "/default-profile.png"}
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
                    className="text-sm bg-[#6B4D33] text-white px-3 py-1 rounded hover:bg-[#533A26]"
                  >
                    게시물 관리
                  </Link>
                  <Link
                    to="/admin/comments"
                    className="text-sm bg-[#6B4D33] text-white px-3 py-1 rounded hover:bg-[#533A26]"
                  >
                    댓글 관리
                  </Link>
                  <Link
                    to="/admin/users"
                    className="text-sm bg-[#6B4D33] text-white px-3 py-1 rounded hover:bg-[#533A26]"
                  >
                    유저 관리
                  </Link>
                </>
              )}

              {/* 📧 이메일 & 관리자 여부 표시 */}
 {userInfo?.name && (
  <span className="text-sm flex items-center gap-2 whitespace-nowrap">
    <span>{userInfo.name}</span>
    <Link to="/profile" className="underline text-[#6B4D33] hover:text-[#533A26]">
      마이페이지
    </Link>
    {role === "admin" && (
      <span className="text-orange-300 font-bold">[관리자]</span>
    )}
  </span>
)}



              {/* 🔓 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="text-sm bg-[#6B4D33] text-white px-3 py-1 rounded hover:bg-[#533A26]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link to="/login">
  <div className="text-sm bg-[#6B4D33] text-white px-4 py-2 rounded font-bold hover:bg-[#533A26]">
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
                  ? "bg-white text-[#4B3621] font-bold"
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
