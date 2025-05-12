export const uploadImageAndGetURL = async (file, userId = "anonymous") => {
  try {
    if (!file || !(file instanceof Blob)) {
      throw new Error("유효하지 않은 파일입니다");
    }

    const timestamp = Date.now();
    const safeName = encodeURIComponent(file.name?.replace(/\s+/g, "_") || `image_${timestamp}`);
    const finalName = `${userId}_${timestamp}_${safeName}`;

    console.log("✅ 업로드 요청:", finalName);

    // ✅ 모바일 대응: 기본 Content-Type 설정
    const contentType = file.type || "image/jpeg";

    const response = await fetch("https://us-central1-politalk-4e0dd.cloudfunctions.net/uploadImage", {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        "x-filename": finalName,
       
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ 업로드 응답:", data);

    if (!data.url || !data.url.startsWith("http")) {
      throw new Error("잘못된 업로드 응답");
    }

    return data.url;
  } catch (error) {
    console.error("❌ 이미지 업로드 실패:", error);
    throw error;
  }
};
