import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ ok: false, error: "Token and password are required" }, { status: 400 });
    }

    const row = await prisma.verificationToken.findUnique({ where: { token } });
    if (!row || row.expires < new Date()) {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }

    const email = row.identifier;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // на всякий случай
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? "12");
    const passwordHash = await bcrypt.hash(String(password), saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // погасим токен
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Server error" }, { status: 500 });
  }
}
