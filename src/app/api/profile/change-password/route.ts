// src/app/api/profile/change-password/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-guards";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const userId = (session!.user as any).id as string;

  const body = await req.json().catch(() => ({} as any));
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (newPassword.length < 8 || newPassword.length > 100) {
    return NextResponse.json({ error: "Новый пароль должен быть 8–100 символов" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Если пароль уже установлен — проверяем текущий
  if (user.passwordHash) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Текущий пароль неверный" }, { status: 400 });
    }
  }

  const rounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(newPassword, rounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true });
}
