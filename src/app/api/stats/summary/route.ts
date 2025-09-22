// src/app/api/stats/summary/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function parseRange(url: URL) {
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  return { from, to };
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to } = parseRange(url);
  const userId = (session!.user as any).id as string;

  const [clicks, convAgg] = await Promise.all([
    prisma.click.count({
      where: {
        userId,
        createdAt: { gte: from, lt: to },
      },
    }),
    prisma.conversion.aggregate({
      where: {
        userId,
        createdAt: { gte: from, lt: to },
      },
      _count: { _all: true },
      _sum: { amount: true },
    }),
  ]);

  const conversions = convAgg._count._all ?? 0;
  const revenue = Number(convAgg._sum.amount ?? 0);
  const epc = clicks > 0 ? revenue / clicks : 0;
  const cr = clicks > 0 ? (conversions / clicks) : 0;

  return NextResponse.json({
    from, to,
    clicks,
    conversions,
    revenue,
    epc,        // earnings per click
    cr,         // conversion rate (0..1)
  });
}
