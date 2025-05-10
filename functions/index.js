const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { Storage } = require("@google-cloud/storage");

admin.initializeApp();
const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.appspot.com");

// ✅ 공통 CORS 처리 함수
const handleCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, x-filename");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
};

// ✅ 이미지 업로드 함수
exports.uploadImage = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const fileName = req.headers["x-filename"];
    const buffer = req.rawBody;
    const contentType = req.headers["content-type"];

    const file = bucket.file(`images/${fileName}`);
    await file.save(buffer, { metadata: { contentType } });
    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/images/${fileName}`;
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error("❌ 이미지 업로드 실패:", error);
    res.status(500).send("Upload failed");
  }
});

// ✅ 카카오 로그인 함수
exports.kakaoLogin = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: "accessToken 누락" });
      return;
    }

    const kakaoRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const kakaoData = await kakaoRes.json();
    const kakaoUid = `kakao:${kakaoData.id}`;
    const customToken = await admin.auth().createCustomToken(kakaoUid);

    res.status(200).json({ firebaseToken: customToken });
  } catch (error) {
    console.error("❌ 카카오 로그인 실패:", error);
    res.status(500).json({ error: "카카오 로그인 실패" });
  }
});

// ✅ 네이버 로그인 함수
exports.naverLogin = functions.https.onRequest(async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: "accessToken 누락됨" });
      return;
    }

    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profileData = await profileRes.json();
    if (!profileData.response || !profileData.response.id) {
      res.status(400).json({ error: "네이버 사용자 정보 조회 실패" });
      return;
    }

    const naverId = `naver:${profileData.response.id}`;
    const customToken = await admin.auth().createCustomToken(naverId);

    res.status(200).json({ firebaseToken: customToken });
  } catch (error) {
    console.error("❌ 네이버 로그인 실패:", error);
    res.status(500).json({ error: "네이버 로그인 실패" });
  }
});
