// POST /api/wallets/primary -> {walletId} сделать основным
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { walletId } = (await req.json().catch(() => ({} as any))) as { walletId?: string };
  if (!walletId) return NextResponse.json({ error: "walletId required" }, { status: 400 });

  // убеждаемся, что кошелёк принадлежит пользователю
  const w = await prisma.wallet.findFirst({ where: { id: walletId, userId }, select: { id: true } });
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.wallet.updateMany({ where: { userId }, data: { isPrimary: false } }),
    prisma.wallet.update({ where: { id: walletId }, data: { isPrimary: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
