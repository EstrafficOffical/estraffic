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

  // --- временный админ-просмотр всех данных ---
  const isAll = url.searchParams.get("all") === "1" && role === "ADMIN";
  const whereBase: any = { createdAt: { gte: from, lt: to } };
  if (!isAll) whereBase.userId = userId;

  // агрегаты кликов и конверсий по offerId
  const [clicks, convs] = await Promise.all([
    prisma.click.groupBy({
      by: ["offerId"],
      where: whereBase,
      _count: { _all: true },
    }),
    prisma.conversion.groupBy({
      by: ["offerId"],
      where: whereBase,
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  // нужные офферы для метаданных (title/tag)
  const offerIds = Array.from(
    new Set([
      ...clicks.map((c) => String(c.offerId)),
      ...convs.map((c) => String(c.offerId)),
    ])
  ).filter(Boolean) as string[];

  const offers = offerIds.length
    ? await prisma.offer.findMany({
        where: { id: { in: offerIds } },
        select: { id: true, title: true, tag: true },
      })
    : [];

  const byId = new Map(offers.map((o) => [o.id, o]));

  // карта кликов { offerId -> count }
  const mapClicks = new Map<string, number>();
  for (const c of clicks) mapClicks.set(String(c.offerId), c._count._all ?? 0);

  // строки по конверсиям
  const items = convs.map((v) => {
    const offerId = String(v.offerId);
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

  // офферы, где были клики, но нет конверсий
  for (const [offerId, clicksCount] of mapClicks) {
    if (!items.find((i) => i.offerId === offerId)) {
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
  }

  items.sort(
    (a, b) => b.revenue - a.revenue || b.conversions - a.conversions || b.clicks - a.clicks
  );
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

  return NextResponse.json({ from, to, items: top, totals, scope: isAll ? "ALL" : "OWN" });
}
