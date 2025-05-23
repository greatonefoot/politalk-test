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

exports.naverLogin = functions.https.onRequest((req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const { code, state } = req.query;

  const NAVER_CLIENT_ID = "KzNqOG3o5fJpv3t2qJ4k";
  const NAVER_CLIENT_SECRET = "vGYO_15MVr"; // 🔒 비공개 유지

  const fetch = require("node-fetch");

  (async () => {
    try {
      // 1단계: 액세스 토큰 요청
      const tokenRes = await fetch(
        `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${NAVER_CLIENT_ID}&client_secret=${NAVER_CLIENT_SECRET}&code=${code}&state=${state}`
      );
      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) throw new Error("토큰 요청 실패");

      // 2단계: 사용자 정보 요청
      const userRes = await fetch("https://openapi.naver.com/v1/nid/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      const userData = await userRes.json();
      const { id, email } = userData.response;
      if (!id) throw new Error("사용자 정보 없음");

      // 3단계: Firebase 사용자 등록 또는 확인
      const firebaseUid = `naver:${id}`;
      await admin.auth().getUser(firebaseUid).catch(async (error) => {
        if (error.code === "auth/user-not-found") {
          await admin.auth().createUser({
            uid: firebaseUid,
            email: email || undefined,
          });
        } else {
          throw error;
        }
      });

      // 4단계: Custom Token 발급
      const customToken = await admin.auth().createCustomToken(firebaseUid);
      return res.status(200).json({ customToken });
    } catch (err) {
      console.error("네이버 로그인 오류:", err);
      return res.status(500).json({ error: "네이버 로그인 실패" });
    }
  })();
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
