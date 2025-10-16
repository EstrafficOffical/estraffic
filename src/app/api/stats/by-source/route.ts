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
  const userId = String((session!.user as any).id);
  const role   = String((session!.user as any).role ?? "USER");

  const isAll = url.searchParams.get("all") === "1" && role === "ADMIN";

  const whereClicks: any = { createdAt: { gte: from, lt: to } };
  const whereConvs:  any = { createdAt: { gte: from, lt: to } };
  if (!isAll) {
    whereClicks.userId = userId;
    whereConvs.userId  = userId;
  }

  const [clicks, convBySourceType] = await Promise.all([
    prisma.click.groupBy({
      by: ["subId"],
      where: whereClicks,
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ["subId", "type"],
      where: whereConvs,
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const clicksMap = new Map<string, number>();
  for (const r of clicks) clicksMap.set(label(r.subId as any), r._count._all ?? 0);

  type Acc = { regs: number; deps: number; conversions: number; revenue: number };
  const accBySource = new Map<string, Acc>();
  for (const v of convBySourceType) {
    const key = label(v.subId as any);
    const acc = accBySource.get(key) ?? { regs: 0, deps: 0, conversions: 0, revenue: 0 };
    acc.conversions += v._count._all ?? 0;
    acc.revenue += Number(v._sum.amount ?? 0);
    if ((v.type as any) === "REG") acc.regs += v._count._all ?? 0;
    if ((v.type as any) === "DEP") acc.deps += v._count._all ?? 0;
    accBySource.set(key, acc);
  }

  const keys = Array.from(new Set([...Array.from(clicksMap.keys()), ...Array.from(accBySource.keys())]));
  const items = keys.map((key) => {
    const clicksCount = clicksMap.get(key) ?? 0;
    const acc = accBySource.get(key) ?? { regs: 0, deps: 0, conversions: 0, revenue: 0 };
    const epc = clicksCount > 0 ? acc.revenue / clicksCount : 0;
    const cr  = clicksCount > 0 ? acc.conversions / clicksCount : 0;
    return {
      source: key === "(none)" ? null : key,
      clicks: clicksCount,
      conversions: acc.conversions,
      revenue: acc.revenue,
      epc, cr,
      regs: acc.regs,   // NEW
      deps: acc.deps,   // NEW
    };
  });

  items.sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions || b.clicks - a.clicks);
  const top = items.slice(0, limit);

  const totals = top.reduce(
    (acc, x) => {
      acc.clicks += x.clicks;
      acc.conversions += x.conversions;
      acc.revenue += x.revenue;
      acc.regs += x.regs;
      acc.deps += x.deps;
      return acc;
    },
    { clicks: 0, conversions: 0, revenue: 0, regs: 0, deps: 0 }
  );

  return NextResponse.json({ from, to, items: top, totals, scope: isAll ? "ALL" : "OWN" });
}
