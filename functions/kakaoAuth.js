const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// ⚠️ initializeApp()은 index.js에서만 호출해야 함
// 여기서는 호출하지 않음 (중복 방지)

exports.kakaoLogin = functions.https.onRequest(async (req, res) => {
  // ✅ CORS 허용
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // ✅ Preflight 요청 처리
  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "accessToken missing" });
    }

    // 🔐 Kakao API로 사용자 정보 가져오기
    const kakaoRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!kakaoRes.ok) {
      return res.status(401).json({ error: "Kakao accessToken invalid" });
    }

    const kakaoData = await kakaoRes.json();
    const kakaoUid = `kakao_${kakaoData.id}`;

    // ✅ Firebase Custom Token 생성
    const customToken = await admin.auth().createCustomToken(kakaoUid);

    return res.status(200).json({ token: customToken });
  } catch (err) {
    console.error("🔥 kakaoLogin error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
