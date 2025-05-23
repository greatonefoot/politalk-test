// functions/index.js

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const { kakaoLogin } = require("./kakaoAuth");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

admin.initializeApp();

const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.firebasestorage.app");

// ✅ 이미지 업로드 함수
exports.uploadImage = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-filename");
    res.status(204).send("");
    return;
  }

  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type, x-filename");

  try {
    const fileName = req.headers["x-filename"];
    const buffer = req.rawBody;
    const contentType = req.headers["content-type"];

    if (!fileName || !buffer || !contentType) {
      res.status(400).send("Missing file data");
      return;
    }

    const file = bucket.file(`images/${fileName}`);
    await file.save(buffer, { metadata: { contentType } });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/images/${fileName}`;
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error("❌ Upload failed:", error);
    res.status(500).send("Upload failed");
  }
});

// ✅ 카카오 로그인 함수
exports.kakaoLogin = kakaoLogin;

// ✅ 네이버 로그인 CORS 확인용 함수
exports.naverLogin = functions.https.onRequest((req, res) => {
  // ✅ 모든 요청 방식에 CORS 허용
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  res.status(200).json({ message: "CORS OK, 함수 호출 성공" });
});

// ✅ Firebase Auth 사용자 삭제 함수
exports.deleteAuthUser = functions.https.onCall(async (data, context) => {
  const { uid } = data;

  if (!context.auth || context.auth.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }

  try {
    await admin.auth().deleteUser(uid);
    console.log(`✅ Auth 계정 삭제 완료: ${uid}`);
    return { success: true };
  } catch (error) {
    console.error("❌ Auth 계정 삭제 실패:", error);
    throw new functions.https.HttpsError("internal", "사용자 삭제 실패");
  }
});
