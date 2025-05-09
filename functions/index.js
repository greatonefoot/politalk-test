import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { Storage } from "@google-cloud/storage";
import admin from "firebase-admin";
import fetch from "node-fetch"; // 🔥 반드시 설치: npm install node-fetch

initializeApp();

const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.firebasestorage.app");

// ✅ 이미지 업로드 함수 (기존 코드)
export const uploadImage = onRequest({ region: "us-central1", memory: "128MiB" }, async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-filename');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

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
    console.error("❌ 업로드 실패:", error);
    res.status(500).send("Upload Failed");
  }
});

// ✅ 카카오 로그인 처리용 함수
export const kakaoLogin = onRequest({ region: "asia-northeast3" }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

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

    // 🔒 Firebase Custom Token 발급
    const customToken = await admin.auth().createCustomToken(kakaoUid);
    res.status(200).json({ firebaseToken: customToken });
  } catch (error) {
    console.error("❌ 카카오 로그인 실패:", error);
    res.status(500).json({ error: "카카오 로그인 실패" });
  }
});
