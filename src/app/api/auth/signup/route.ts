// src/app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password, name, telegram } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalized = String(email).toLowerCase().trim();

    const exists = await prisma.user.findUnique({ where: { email: normalized } });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "User already exists" },
        { status: 409 }
      );
    }

    const rounds = Number.parseInt(String(process.env.BCRYPT_SALT_ROUNDS ?? 12), 10);
    const saltRounds = Number.isFinite(rounds) ? rounds : 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const created = await prisma.user.create({
      data: {
        email: normalized,
        name: name ?? null,
        // если поля нет в схеме — удалите строку ниже
        telegram: telegram ?? null,
        passwordHash,
        // 🔧 универсально для любых версий Prisma Client:
        role: "USER" as any,
        status: "PENDING" as any,
      },
      select: { id: true, email: true, name: true },
    });

    const user = { ...created, status: "PENDING" as const };

    return NextResponse.json(
      { ok: true, user, message: "Registration submitted. Wait for approval." },
      { status: 201 }
    );
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
