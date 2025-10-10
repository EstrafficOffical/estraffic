// POST /api/wallets  — создать кошелёк (address-only)
// body: { address: string }
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function detectLabel(address: string): string {
  const a = address.trim();
  if (/^T[0-9A-Za-z]{33}$/.test(a)) return "USDT TRC20";
  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return "USDT ERC20";
  return "Crypto";
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { address } = (await req.json().catch(() => ({}))) as { address?: string };
  if (!address || address.trim().length < 4) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  const label = detectLabel(address);

  const created = await prisma.$transaction(async (tx) => {
    const hasAny = await tx.wallet.count({ where: { userId } });
    return tx.wallet.create({
      data: {
        userId,
        label,
        address: address.trim(),
        verified: false,
        isPrimary: hasAny === 0,
      },
      select: { id: true },
    });
  });

  return NextResponse.json({ ok: true, id: created.id });
}
