// src/app/api/stats/summary/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function parseRange(url: URL) {
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");

  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr
    ? new Date(fromStr)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);

  return { from, to };
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to } = parseRange(url);
  const userId = String((session!.user as any).id);

  const range = {
    gte: from,
    lt: to,
  };

  const [clicks, convAgg, regs, deps] = await Promise.all([
    prisma.nexusClick.count({
      where: {
        userId,
        createdAt: range,
      },
    }),

    prisma.nexusConversion.aggregate({
      where: {
        userId,
        status: "APPROVED",
        createdAt: range,
      },
      _count: {
        _all: true,
      },
      _sum: {
        affiliatePayout: true,
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId,
        type: "REG",
        status: "APPROVED",
        createdAt: range,
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId,
        type: "DEP",
        status: "APPROVED",
        createdAt: range,
      },
    }),
  ]);

  const conversions = convAgg._count._all ?? 0;
  const revenue = Number(convAgg._sum.affiliatePayout ?? 0);
  const epc = clicks > 0 ? revenue / clicks : 0;
  const cr = clicks > 0 ? conversions / clicks : 0;

  return NextResponse.json({
    from,
    to,
    clicks,
    conversions,
    revenue,
    epc,
    cr,
    regs,
    deps,
    source: "NexusClick+NexusConversion",
  });
}