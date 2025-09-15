import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { randomUUID } from "crypto";

export const runtime = "nodejs"; // нужен Node.js runtime (Buffer, formData и т.п.)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // По умолчанию в типах NextAuth нет user.id — достанем через каст.
  const userId = (session?.user as { id?: string } | undefined)?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ ok: false, error: "no_file" }, { status: 400 });
  }

  const allow = ["image/jpeg", "image/png", "image/webp"] as const;
  if (!allow.includes(file.type as any)) {
    return NextResponse.json({ ok: false, error: "unsupported_type" }, { status: 415 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  }

  // Подберём расширение по MIME
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
      ? "webp"
      : "jpg";

  const key = `${userId}/${randomUUID()}.${ext}`;

  try {
    // Загрузка в Supabase Storage
    const ab = await file.arrayBuffer();
    const { error: upErr } = await supabaseAdmin
      .storage
      .from("avatars")
      .upload(key, Buffer.from(ab), { contentType: file.type });

    if (upErr) {
      console.error("[avatar upload] supabase error:", upErr);
      return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
    }

    // Публичная ссылка
    const { data } = supabaseAdmin.storage.from("avatars").getPublicUrl(key);
    const publicUrl = data.publicUrl;

    // Обновим картинку у пользователя (user.image — стандартное поле NextAuth)
    await prisma.user.update({
      where: { id: userId },
      data: { image: publicUrl },
    });

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e) {
    console.error("[avatar upload] server error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
