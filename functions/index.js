// functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { Storage } from "@google-cloud/storage";

initializeApp();

const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.firebasestorage.app");

export const uploadImage = onRequest({ region: "us-central1", memory: "128MiB" }, async (req, res) => {
  // ✅ CORS 직접 수동 처리
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
    await file.save(buffer, {
      metadata: {
        contentType,
      },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/images/${fileName}`;
    res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error("❌ 업로드 실패:", error);
    res.status(500).send("Upload Failed");
  }
});
