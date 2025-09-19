// src/app/api/stats/by-source/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function parseRange(url: URL) {
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));
  return { from, to, limit };
}
const label = (v: string | null) => (v && v.trim()) ? v.trim() : "(none)";

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to, limit } = parseRange(url);
  const userId = (session!.user as any).id as string;

  const [clicks, convs] = await Promise.all([
    prisma.click.groupBy({
      by: ["sub1"],
      where: { userId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ["sub1"],
      where: { userId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const mapC = new Map<string, number>();
  for (const r of clicks) mapC.set(label(r.sub1 as any), r._count._all ?? 0);

  const items = convs.map(v => {
    const key = label(v.sub1 as any);
    const clicksCount = mapC.get(key) ?? 0;
    const conversions = v._count._all ?? 0;
    const revenue = Number(v._sum.amount ?? 0);
    const epc = clicksCount > 0 ? revenue / clicksCount : 0;
    const cr = clicksCount > 0 ? conversions / clicksCount : 0;
    return { source: key, clicks: clicksCount, conversions, revenue, epc, cr };
  });

  // источники с кликами, но без конверсий
  for (const [k, c] of mapC) {
    if (!items.find(i => i.source === k)) {
      items.push({ source: k, clicks: c, conversions: 0, revenue: 0, epc: 0, cr: 0 });
    }
  }

  items.sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions || b.clicks - a.clicks);
  const top = items.slice(0, limit);

  const totals = top.reduce(
    (acc, x) => {
      acc.clicks += x.clicks;
      acc.conversions += x.conversions;
      acc.revenue += x.revenue;
      return acc;
    },
    { clicks: 0, conversions: 0, revenue: 0 }
  );

  return NextResponse.json({ from, to, items: top, totals });
}
