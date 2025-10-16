// src/app/api/stats/by-offer/route.ts
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

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to, limit } = parseRange(url);

  const userId = String((session!.user as any).id);
  const role   = String((session!.user as any).role ?? "USER");

  const isAll = url.searchParams.get("all") === "1" && role === "ADMIN";
  const baseWhere: any = { createdAt: { gte: from, lt: to } };
  if (!isAll) baseWhere.userId = userId;

  const [clicks, convByOfferType] = await Promise.all([
    prisma.click.groupBy({
      by: ["offerId"],
      where: baseWhere,
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ["offerId", "type"],
      where: baseWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // метаданные офферов
  const offerIds = Array.from(
    new Set([...clicks.map(c => String(c.offerId)), ...convByOfferType.map(v => String(v.offerId))])
  );
  const offers = offerIds.length
    ? await prisma.offer.findMany({ where: { id: { in: offerIds } }, select: { id: true, title: true, tag: true } })
    : [];
  const metaById = new Map(offers.map(o => [o.id, o]));

  // карта кликов
  const clicksMap = new Map<string, number>();
  for (const c of clicks) clicksMap.set(String(c.offerId), c._count._all ?? 0);

  // агрегируем regs/deps/revenue/conversions
  type Acc = { regs: number; deps: number; conversions: number; revenue: number };
  const accByOffer = new Map<string, Acc>();
  for (const v of convByOfferType) {
    const id = String(v.offerId);
    const acc = accByOffer.get(id) ?? { regs: 0, deps: 0, conversions: 0, revenue: 0 };
    acc.conversions += v._count._all ?? 0;
    acc.revenue += Number(v._sum.amount ?? 0);
    if ((v.type as any) === "REG") acc.regs += v._count._all ?? 0;
    if ((v.type as any) === "DEP") acc.deps += v._count._all ?? 0;
    accByOffer.set(id, acc);
  }

  const items = Array.from(new Set([...offerIds, ...Array.from(clicksMap.keys())])).map((offerId) => {
    const meta = metaById.get(offerId);
    const clicksCount = clicksMap.get(offerId) ?? 0;
    const acc = accByOffer.get(offerId) ?? { regs: 0, deps: 0, conversions: 0, revenue: 0 };
    const epc = clicksCount > 0 ? acc.revenue / clicksCount : 0;
    const cr = clicksCount > 0 ? acc.conversions / clicksCount : 0;
    return {
      offerId,
      title: meta?.title ?? offerId,
      tag: meta?.tag ?? null,
      clicks: clicksCount,
      conversions: acc.conversions,
      revenue: acc.revenue,
      epc,
      cr,
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
