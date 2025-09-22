// src/app/api/profile/change-password/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const id = (session.user as any).id as string;

  const body = await req.json().catch(() => ({}));
  const cur = String(body.currentPassword ?? "");
  const next = String(body.newPassword ?? "");

  if (!cur || !next || next.length < 6) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  if (!user?.passwordHash) return NextResponse.json({ error: "NO_LOCAL_PASSWORD" }, { status: 400 });

  const ok = await bcrypt.compare(cur, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "WRONG_PASSWORD" }, { status: 400 });

  const hash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash: hash } });

  return NextResponse.json({ ok: true });
}
