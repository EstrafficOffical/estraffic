// src/app/api/stats/by-offer/route.ts
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

  // агрегаты кликов и конверсий по offerId
  const [clicks, convs] = await Promise.all([
    prisma.click.groupBy({
      by: ["offerId"],
      where: { userId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ["offerId"],
      where: { userId, createdAt: { gte: from, lt: to } },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const offerIds = Array.from(new Set([
    ...clicks.map(c => c.offerId),
    ...convs.map(c => c.offerId),
  ])).filter(Boolean) as string[];

  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds } },
    select: { id: true, title: true, tag: true },
  });
  const byId = new Map(offers.map(o => [o.id, o]));

  const mapClicks = new Map<string, number>();
  for (const c of clicks) mapClicks.set(c.offerId as string, c._count._all ?? 0);

  const items = convs.map(v => {
    const offerId = v.offerId as string;
    const clicksCount = mapClicks.get(offerId) ?? 0;
    const conversions = v._count._all ?? 0;
    const revenue = Number(v._sum.amount ?? 0);
    const epc = clicksCount > 0 ? revenue / clicksCount : 0;
    const cr = clicksCount > 0 ? conversions / clicksCount : 0;
    const meta = byId.get(offerId);
    return {
      offerId,
      title: meta?.title ?? offerId,
      tag: meta?.tag ?? null,
      clicks: clicksCount,
      conversions,
      revenue,
      epc,
      cr,
    };
  });

  // добавим офферы, у которых были клики, но пока 0 конверсий
  for (const [offerId, clicksCount] of mapClicks) {
    if (items.find(i => i.offerId === offerId)) continue;
    const meta = byId.get(offerId);
    items.push({
      offerId,
      title: meta?.title ?? offerId,
      tag: meta?.tag ?? null,
      clicks: clicksCount,
      conversions: 0,
      revenue: 0,
      epc: 0,
      cr: 0,
    });
  }

  // сортируем по выручке ↓
  items.sort((a, b) => b.revenue - a.revenue || b.conversions - a.conversions || b.clicks - a.clicks);

  return NextResponse.json({ from, to, items });
}
