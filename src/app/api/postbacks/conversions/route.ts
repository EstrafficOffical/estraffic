// src/app/api/postbacks/conversions/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guards";

export async function GET() {
  const { session, res } = await requireAuth();
  if (res) return res;
  const userId = (session!.user as any).id as string;

  const rows = await prisma.conversion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { offer: { select: { title: true } } },
  });

  const safe = rows.map((r) => ({
    id: r.id,
    offerTitle: r.offer?.title ?? "",
    amount: r.amount != null ? Number(r.amount) : 0,
    currency: r.currency,
    type: r.type,
    txId: r.txId,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ items: safe });
}
