// backend/routes/adminRoutes.js
const express = require("express");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { reloadFromJson } = require("../models/LatentFactors");

const router = express.Router();
const ADMIN_KEY = process.env.ADMIN_KEY;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";

function adminAuth(req, res, next) {
  if (!ADMIN_KEY) return res.status(500).json({ message: "ADMIN_KEY not set" });
  const key = req.header("x-admin-key");
  if (key !== ADMIN_KEY)
    return res.status(401).json({ message: "Unauthorized" });
  next();
}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (c) => chunks.push(Buffer.from(c)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function fetchJsonFromS3(bucket, key) {
  const s3 = new S3Client({ region: AWS_REGION });
  const resp = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  const str = await streamToString(resp.Body);
  return JSON.parse(str);
}

/**
 * POST /api/admin/reload-model
 * Body (optional): { bucket: "...", key: "models/cf_factors.json" }
 * Header: x-admin-key: <ADMIN_KEY>
 */
router.post("/reload-model", adminAuth, async (req, res) => {
  try {
    const bucket = req.body?.bucket || process.env.S3_BUCKET;
    const key =
      req.body?.key ||
      `${(process.env.S3_PREFIX || "models").replace(
        /\/+$/,
        ""
      )}/cf_factors.json`;

    if (!bucket)
      return res
        .status(400)
        .json({ message: "Missing bucket (env S3_BUCKET or body.bucket)" });

    const json = await fetchJsonFromS3(bucket, key);
    reloadFromJson(json);

    return res.json({
      message: "Model reloaded",
      items: Object.keys(json.item2idx || {}).length,
      dims: Array.isArray(json.Q) && json.Q[0] ? json.Q[0].length : 0,
      source: `s3://${bucket}/${key}`,
    });
  } catch (err) {
    console.error("reload-model error:", err);
    return res.status(500).json({ message: "Reload failed" });
  }
});

module.exports = router;
