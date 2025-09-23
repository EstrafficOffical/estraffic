// src/app/api/wallet/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: вернуть кошелёк текущего пользователя
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Берём только id пользователя
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "user not found" }, { status: 404 });
  }

  // А кошелёк читаем отдельным запросом — так не зависит от relation в типах
  const wallet = await prisma.wallet.findFirst({
    where: { userId: user.id } as any,
    // если в типах нет каких-то полей (chain/verified) — не перечисляем select
  });

  return NextResponse.json({ ok: true, wallet: wallet ?? null });
}

// POST: создать/обновить кошелёк
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
  const address: string = (body.address || "").trim();
  const chain: string = (body.chain || "evm").trim();

  if (!address) {
    return NextResponse.json({ ok: false, error: "address required" }, { status: 400 });
  }
  if (!["evm", "tron", "sol"].includes(chain)) {
    return NextResponse.json({ ok: false, error: "invalid chain" }, { status: 400 });
  }

  // Если нет уникального индекса по userId, upsert не сработает — делаем руками
  const existing = await prisma.wallet.findFirst({
    where: { userId: user.id } as any,
  });

  let wallet;
  if (existing) {
    wallet = await prisma.wallet.update({
      where: { id: existing.id },
      // chain может отсутствовать в типах — добавляем через any
      data: { address, ...(existing as any) && { chain } } as any,
    });
  } else {
    wallet = await prisma.wallet.create({
      data: { userId: user.id, address, ...( { chain } as any) } as any,
    });
  }

  return NextResponse.json({ ok: true, wallet });
}
