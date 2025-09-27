// src/lib/s3.ts
import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined, // например, https://s3.eu-central-1.amazonaws.com или кастомное S3-совместимое
  forcePathStyle: !!process.env.S3_ENDPOINT, // для S3-совместимых
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
});

export const S3_BUCKET = process.env.S3_BUCKET || "";
export const S3_PUBLIC_BASEURL =
  process.env.S3_PUBLIC_BASEURL || ""; // если используешь CDN, укажи https://cdn.domain.com
