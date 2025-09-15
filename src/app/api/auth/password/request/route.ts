import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    }
    const normalized = String(email).toLowerCase().trim();

    // есть ли такой пользователь
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    // даже если нет — возвращаем 200, чтобы не палить существование
    // но токен писать не будем
    if (!user) {
      return NextResponse.json({ ok: true, message: "If user exists, an email was sent" });
    }

    // генерим токен и пишем в VerificationToken
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 час

    // чистим старые токены для этого email (опционально)
    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });

    await prisma.verificationToken.create({
      data: {
        identifier: normalized, // email
        token,
        expires,
      },
    });

    // соберём URL
    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${origin}/en/auth/reset?token=${encodeURIComponent(token)}`;

    // В ПРОДЕ — отправь письмо через почтовый сервис.
    // В DEV — вернём ссылку прямо в ответе:
    return NextResponse.json({ ok: true, resetUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
