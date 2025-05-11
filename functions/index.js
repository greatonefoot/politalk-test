// ✅ 꼭 이 방식으로 유지할 것
import { onRequest } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { Storage } from "@google-cloud/storage";

initializeApp();
const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.appspot.com");

export const uploadImage = onRequest(
  {
    cors: true,  // 💡 명시적으로 Gen2라고 CLI가 감지함
    region: "us-central1",
  },
  async (req, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, x-filename");
      res.status(204).send("");
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
      console.log("✅ Upload success:", publicUrl);
      res.status(200).json({ url: publicUrl });
    } catch (error) {
      console.error("❌ Upload failed:", error);
      res.status(500).send("Upload failed");
    }
  }
);
