// src/app/api/wallet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET: вернуть кошелек текущего пользователя
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, wallet: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, wallet: user.wallet ?? null });
}

// POST: создать/обновить кошелек
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const address = (body.address || "").trim();
  const chain = (body.chain || "evm").trim();

  // простая валидация формата
  if (!address) {
    return NextResponse.json({ ok: false, error: "address required" }, { status: 400 });
  }
  if (!["evm", "tron", "sol"].includes(chain)) {
    return NextResponse.json({ ok: false, error: "invalid chain" }, { status: 400 });
  }

  // сохраняем
  const wallet = await prisma.wallet.upsert({
    where: { userId: user.id },
    update: { address, chain },
    create: { userId: user.id, address, chain },
  });

  return NextResponse.json({ ok: true, wallet });
}
