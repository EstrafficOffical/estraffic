// src/app/api/stats/by-event/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function parseRange(url: URL) {
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  return { from, to };
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to } = parseRange(url);
  const userId = (session!.user as any).id as string;

  const rows = await prisma.conversion.groupBy({
    by: ["type"],
    where: { userId, createdAt: { gte: from, lt: to } },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const items = rows.map(r => ({
    type: r.type as string,
    conversions: r._count._all ?? 0,
    revenue: Number(r._sum.amount ?? 0),
  }))
  // сорт по выручке, затем по количеству
  .sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions);

  const totalConv = items.reduce((s, x) => s + x.conversions, 0);
  const totalRev = items.reduce((s, x) => s + x.revenue, 0);

  return NextResponse.json({ from, to, items, totalConv, totalRev });
}
