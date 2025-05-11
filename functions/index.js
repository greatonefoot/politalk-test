// ✅ functions/index.js
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { Storage } from "@google-cloud/storage";

initializeApp();
const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.appspot.com");

export const uploadImage = onRequest(
  {
    cors: true,
    region: "us-central1",
  },
  async (req, res) => {
    // ✅ CORS 수동 처리 추가
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, x-filename");

    if (req.method === "OPTIONS") {
      res.status(204).send(""); // Preflight 응답
      return;
    }

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
      console.log("✅ 업로드 성공:", publicUrl);
      res.status(200).json({ url: publicUrl });
    } catch (error) {
      console.error("❌ 업로드 실패:", error);
      res.status(500).send("Upload failed");
    }
  }
);
