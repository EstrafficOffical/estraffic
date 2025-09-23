import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {prisma} from "@/lib/prisma"; // убедись, что экспорт по умолчанию

export async function POST(req: Request) {
  try {
    const { email, telegram, country, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email и пароль обязательны" }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
    }

    const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        telegram: telegram || null,
        // country можно хранить, если есть колонка; иначе убери
        role: "USER",
        status: "PENDING",
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, userId: user.id });
  } catch (e) {
    console.error("register POST error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
