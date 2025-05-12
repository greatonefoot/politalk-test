const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");


exports.kakaoLogin = functions.https.onRequest(async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "accessToken missing" });
    }

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

    const customToken = await admin.auth().createCustomToken(kakaoUid);

    return res.json({ token: customToken });
  } catch (err) {
    console.error("🔥 kakaoLogin error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});
