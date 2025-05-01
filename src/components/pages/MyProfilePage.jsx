import React, { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useNavigate, Link } from "react-router-dom";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { uploadImageAndGetURL } from "../../utils/uploadImage";

const MyProfilePage = () => {
  const [user, loading] = useAuthState(auth);
  const [profileData, setProfileData] = useState(null);
  const [newName, setNewName] = useState("");
  const [newProfilePic, setNewProfilePic] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) return navigate("/login");

    const fetchProfile = async () => {
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileData(data);
        setNewName(data.name || "");
      }
    };

    fetchProfile();
  }, [user, loading, navigate]);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setNewProfilePic(e.target.files[0]);
    }
  };

  const handleProfileUpdate = async () => {
    if (!newName.trim()) return alert("닉네임을 입력해주세요.");

    let profilePicUrl = profileData?.profilePic || "";
    if (newProfilePic) {
      const ext = newProfilePic.name.split(".").pop();
      const filename = `${user.uid}.${ext}`;
      profilePicUrl = await uploadImageAndGetURL(newProfilePic, "profilePics", filename);
    }

    await updateDoc(doc(db, "users", user.uid), {
      name: newName.trim(),
      profilePic: profilePicUrl,
    });

    alert("프로필이 성공적으로 업데이트되었습니다.");
    setProfileData({ ...profileData, name: newName, profilePic: profilePicUrl });
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (!profileData) return <div>로딩 중...</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 relative">
      <Link to="/" className="absolute top-4 left-4 text-naver underline text-sm hover:text-naverDark">
        ← 홈으로
      </Link>

      <div className="bg-white w-full max-w-lg p-8 rounded-2xl shadow-xl flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">내 프로필</h1>

        <div className="mb-6 flex flex-col items-center">
          <img
            src={profileData.profilePic || "https://via.placeholder.com/150"}
            alt="Profile"
            className="w-32 h-32 rounded-full object-cover shadow-lg"
          />
          <input type="file" onChange={handleFileChange} className="mt-2 text-sm" />
        </div>

        <div className="w-full mb-4">
          <label className="text-gray-700 font-semibold mb-1 block">닉네임</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <button onClick={handleProfileUpdate} className="w-full bg-blue-500 text-white py-2 rounded-lg mb-4 hover:bg-blue-600 transition">
          프로필 업데이트
        </button>

        <button onClick={handleLogout} className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition">
          로그아웃
        </button>
      </div>
    </div>
  );
};

export default MyProfilePage;
