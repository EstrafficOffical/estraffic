import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  const rows = await prisma.offerAccess.findMany({
    where: { userId, approved: true },
    include: {
      offer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const items = rows.map((r) => ({
    id: r.offer.id,
    title: r.offer.title,
    tag: r.offer.tag ?? null,
    geo: r.offer.geo,
    vertical: r.offer.vertical,
    tier: r.offer.tier,
    cpa: r.offer.cpa != null ? Number(r.offer.cpa) : null,
    mode: r.offer.mode,
    targetUrl: r.offer.targetUrl ?? null,
    cap: r.offer.cap ?? null,
    minDeposit: r.offer.minDeposit != null ? Number(r.offer.minDeposit) : null,
    holdDays: r.offer.holdDays ?? null,
    rules: r.offer.rules ?? null,
    notes: r.offer.notes ?? null,
    kpi1: r.offer.kpi1 ?? null,
    kpi2: r.offer.kpi2 ?? null,
    kpi1Text: r.offer.kpi1Text ?? null,
    kpi2Text: r.offer.kpi2Text ?? null,
  }));

  return NextResponse.json({ items });
}