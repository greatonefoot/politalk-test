// ✅ src/utils/uploadImage.js
export const uploadImageAndGetURL = async (file, userId) => {
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_");
    const finalName = `${userId}_${timestamp}_${safeName}`;

    const response = await fetch("https://uploadimage-wbm25judka-uc.a.run.app", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-filename": finalName,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    const data = await response.json();
    if (!data.url || !data.url.startsWith("http")) {
      throw new Error("잘못된 업로드 응답");
    }

    return data.url;
  } catch (error) {
    console.error("❌ 이미지 업로드 실패:", error);
    return null;
  }
};
