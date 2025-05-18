import React, { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { uploadImageAndGetURL } from "../../utils/uploadImage";
import { onAuthStateChanged } from "firebase/auth";

const SetNickname = () => {
  const [nickname, setNickname] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/login");
      } else {
        setUser(currentUser);
      }
      setCheckingUser(false);
    });
    return () => unsubscribe();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    if (!user) {
      alert("유저 정보가 없습니다.");
      return;
    }

    setLoading(true);
    let profileUrl = "";

    if (profileImage) {
      try {
        profileUrl = await uploadImageAndGetURL(profileImage, user.uid);
      } catch (err) {
        alert("이미지 업로드 실패: " + err.message);
        setLoading(false);
        return;
      }
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: nickname,
        ...(profileUrl && { profilePic: profileUrl }),
      });

      alert("설정 완료!");
      navigate("/");
    } catch (err) {
      alert("업데이트 실패: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return <div className="text-center mt-20 text-gray-600">사용자 정보를 불러오는 중...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-sm w-full bg-white rounded shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-center">닉네임 & 프로필 설정</h2>

        <input
          type="text"
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="border px-3 py-2 rounded w-full mb-4"
        />

        <div className="mb-4">
          <label className="block mb-1">프로필 이미지</label>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {previewUrl && (
            <img
              src={previewUrl}
              alt="미리보기"
              className="mt-2 w-24 h-24 object-cover rounded-full border"
            />
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-green-600 text-white w-full py-2 rounded"
        >
          {loading ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </div>
  );
};

export default SetNickname;
