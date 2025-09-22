// src/app/api/profile/avatar/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs"; // нужен Node для Buffer/fs

// ===== S3 (AWS / R2 / MinIO) =====
async function putToS3(params: {
  buf: Uint8Array;
  mime: string;
  key: string;
}) {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const region = process.env.S3_REGION || "auto";
  const bucket = process.env.S3_BUCKET!;
  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = !!process.env.S3_FORCE_PATH_STYLE;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY!;
  const aclPublicRead = (process.env.S3_ACL_PUBLIC_READ || "false") !== "false";
  const publicBase = process.env.S3_PUBLIC_BASE_URL || "";

  const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.buf,
      ContentType: params.mime,
      ...(aclPublicRead ? ({ ACL: "public-read" } as any) : {}),
    })
  );

  // Публичный URL
  if (publicBase) return `${publicBase.replace(/\/$/, "")}/${params.key}`;
  if (endpoint) return `${endpoint.replace(/\/$/, "")}/${bucket}/${params.key}`;
  return `https://${bucket}.s3.${region}.amazonaws.com/${params.key}`;
}

// ====== Загрузка аватара ======
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, error: "file is required" }, { status: 400 });
  }

  const origName = file.name || "avatar.png";
  const ext = (origName.split(".").pop() || "png").toLowerCase();
  const mime = file.type || (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  const bytes = new Uint8Array(await file.arrayBuffer()); // <— ключевое: Uint8Array

  const filename = `${userId}-${Date.now()}.${ext}`;
  const key = `upload/avatars/${filename}`;

  let publicUrl = "";

  if ((process.env.AVATAR_STORAGE || "").toLowerCase() === "s3") {
    try {
      publicUrl = await putToS3({ buf: bytes, mime, key });
    } catch (e) {
      console.error("S3 upload failed", e);
      return NextResponse.json({ ok: false, error: "s3 upload failed" }, { status: 500 });
    }
  } else {
    // ===== локальный файловый режим (VPS/докер) =====
    const path = await import("node:path");
    const fsp = await import("node:fs/promises");

    const dir = path.join(process.cwd(), "public", "upload", "avatars");
    await fsp.mkdir(dir, { recursive: true });

    const fsPath = path.join(dir, filename);
    await fsp.writeFile(fsPath, bytes); // <— пишем Uint8Array, TS доволен
    publicUrl = `/upload/avatars/${filename}`;
  }

  // сохранить URL в профиле
  await prisma.user.update({
    where: { id: userId },
    data: { image: publicUrl },
  });

  return NextResponse.json({ ok: true, url: publicUrl });
}
