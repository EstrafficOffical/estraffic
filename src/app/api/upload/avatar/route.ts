// src/app/api/upload/avatar/route.ts
import { NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { s3, S3_BUCKET, S3_PUBLIC_BASEURL } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { contentType } = await req.json().catch(() => ({}));
  if (!contentType || !String(contentType).startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Invalid content type" }, { status: 400 });
  }
  if (!S3_BUCKET) {
    return NextResponse.json({ ok: false, error: "S3 not configured" }, { status: 500 });
  }

  const ext = contentType.split("/")[1] || "jpg";
  const key = `avatars/${session.user.id}/${Date.now()}.${ext}`;

  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    // ACL: "public-read", // включи, если используешь ACL. Иначе разруливай доступ политиками бакета/CDN.
  });

  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

  // публичный URL — либо через CDN/Bucket base, либо стандартный S3 хост
  let publicUrl = "";
  if (S3_PUBLIC_BASEURL) {
    publicUrl = `${S3_PUBLIC_BASEURL}/${key}`;
  } else if (process.env.S3_ENDPOINT) {
    const host = new URL(process.env.S3_ENDPOINT).host;
    publicUrl = `https://${host}/${S3_BUCKET}/${key}`;
  } else {
    publicUrl = `https://${S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  return NextResponse.json({ ok: true, uploadUrl, key, publicUrl });
}
