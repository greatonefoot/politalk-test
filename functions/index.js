const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Storage } = require("@google-cloud/storage");
const cors = require("cors")({ origin: true }); // ✅ CORS 미들웨어

admin.initializeApp();
const storage = new Storage();
const bucket = storage.bucket("politalk-4e0dd.appspot.com");

exports.uploadImage = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    try {
      const fileName = req.headers["x-filename"];
      const buffer = req.rawBody;
      const contentType = req.headers["content-type"];

      if (!fileName || !buffer || !contentType) {
        return res.status(400).send("Missing file data");
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
  });
});
