// src/utils/uploadImage.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase"; // ✅ app ❌ → storage만 import

// 🔽 이미지 파일 업로드 후 다운로드 URL 반환
export const uploadImageAndGetURL = async (file, userId) => {
  try {
    const fileRef = ref(storage, `images/${userId}_${file.name}`);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    console.log("✅ 업로드 성공:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("❌ 이미지 업로드 실패:", error);
    return null;
  }
};
