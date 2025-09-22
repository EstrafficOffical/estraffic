// src/app/api/stats/timeseries/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function addDays(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
function parseRange(url: URL) {
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  // округлим по полночь UTC для сетки
  return { from: startOfDay(from), to: startOfDay(addDays(to, 1)) }; // [from, to)
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to } = parseRange(url);
  const userId = (session!.user as any).id as string;

  // Вытащим сырые данные (по дням) отдельными запросами и сведём
  const clicks = await prisma.click.groupBy({
    by: ["createdAt"],
    where: { userId, createdAt: { gte: from, lt: to } },
    _count: { _all: true },
  }).catch(() => []) as any[];

  const convs = await prisma.conversion.groupBy({
    by: ["createdAt"],
    where: { userId, createdAt: { gte: from, lt: to } },
    _count: { _all: true },
    _sum: { amount: true },
  }).catch(() => []) as any[];

  // нормализуем по дням (округление к дню UTC)
  const dayKey = (d: Date) =>
    new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);

  const mapC: Record<string, number> = {};
  for (const r of clicks) {
    const key = dayKey(new Date(r.createdAt));
    mapC[key] = (mapC[key] ?? 0) + (r._count?._all ?? 0);
  }
  const mapV: Record<string, { cnt: number; sum: number }> = {};
  for (const r of convs) {
    const key = dayKey(new Date(r.createdAt));
    const cnt = r._count?._all ?? 0;
    const sum = Number(r._sum?.amount ?? 0);
    mapV[key] = { cnt: (mapV[key]?.cnt ?? 0) + cnt, sum: (mapV[key]?.sum ?? 0) + sum };
  }

  // построим полный диапазон дней
  const series: Array<{ day: string; clicks: number; conversions: number; revenue: number }> = [];
  for (let d = new Date(from); d < to; d = addDays(d, 1)) {
    const key = d.toISOString().slice(0, 10);
    series.push({
      day: key,
      clicks: mapC[key] ?? 0,
      conversions: mapV[key]?.cnt ?? 0,
      revenue: mapV[key]?.sum ?? 0,
    });
  }

  return NextResponse.json({ from, to, series });
}
