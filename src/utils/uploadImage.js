export const uploadImageAndGetURL = async (file, userId = "anonymous") => {
  try {
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_");
    const finalName = `${userId}_${timestamp}_${safeName}`;

    console.log("✅ 업로드 요청:", finalName);

    const response = await fetch("https://us-central1-politalk-4e0dd.cloudfunctions.net/uploadImage", {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-filename": finalName,
        "Access-Control-Allow-Origin": "*",
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
