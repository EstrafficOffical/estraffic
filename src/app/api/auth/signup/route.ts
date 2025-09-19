// src/app/api/auth/signup/route.ts
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

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
      return NextResponse.json({ ok: false, error: "User already exists" }, { status: 409 });
    }

    const rounds = Number.parseInt(String(process.env.BCRYPT_SALT_ROUNDS ?? 12), 10);
    const passwordHash = await bcrypt.hash(password, Number.isFinite(rounds) ? rounds : 12);

    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: name ?? null,
        telegram: telegram ?? null,
        passwordHash,
        role: "USER",
        status: "PENDING",
      },
      select: { id: true, email: true, name: true, status: true },
    });

    return NextResponse.json(
      { ok: true, user, message: "Registration submitted. Wait for approval." },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
