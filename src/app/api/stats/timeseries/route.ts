// src/app/api/stats/timeseries/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function startOfDay(d: Date) {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    ),
  );
}

function addDays(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function parseRange(url: URL) {
  const to = url.searchParams.get("to")
    ? new Date(url.searchParams.get("to")!)
    : new Date();

  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);

  return {
    from: startOfDay(from),
    to: startOfDay(addDays(to, 1)),
  };
}

function dayKey(d: Date) {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to } = parseRange(url);
  const userId = String((session!.user as any).id);

  const [clickRows, conversionRows] = await Promise.all([
    prisma.nexusClick
      .groupBy({
        by: ["createdAt"],
        where: {
          userId,
          createdAt: {
            gte: from,
            lt: to,
          },
        },
        _count: {
          _all: true,
        },
      })
      .catch(() => []),

    prisma.nexusConversion
      .groupBy({
        by: ["createdAt", "type"],
        where: {
          userId,
          status: "APPROVED",
          createdAt: {
            gte: from,
            lt: to,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          affiliatePayout: true,
        },
      })
      .catch(() => []),
  ]);

  const clickMap = new Map<string, number>();

  for (const row of clickRows) {
    const key = dayKey(row.createdAt);
    clickMap.set(
      key,
      (clickMap.get(key) ?? 0) + (row._count._all ?? 0),
    );
  }

  const conversionMap = new Map<
    string,
    {
      conversions: number;
      revenue: number;
      regs: number;
      deps: number;
    }
  >();

  for (const row of conversionRows) {
    const key = dayKey(row.createdAt);
    const current = conversionMap.get(key) ?? {
      conversions: 0,
      revenue: 0,
      regs: 0,
      deps: 0,
    };

    const count = row._count._all ?? 0;

    current.conversions += count;
    current.revenue += Number(row._sum.affiliatePayout ?? 0);

    if (row.type === "REG") {
      current.regs += count;
    }

    if (row.type === "DEP") {
      current.deps += count;
    }

    conversionMap.set(key, current);
  }

  const series: Array<{
    day: string;
    clicks: number;
    conversions: number;
    revenue: number;
    regs: number;
    deps: number;
  }> = [];

  for (let day = from; day < to; day = addDays(day, 1)) {
    const key = dayKey(day);
    const conversion = conversionMap.get(key);

    series.push({
      day: key,
      clicks: clickMap.get(key) ?? 0,
      conversions: conversion?.conversions ?? 0,
      revenue: conversion?.revenue ?? 0,
      regs: conversion?.regs ?? 0,
      deps: conversion?.deps ?? 0,
    });
  }

  return NextResponse.json({
    from,
    to,
    series,
    source: "NexusClick+NexusConversion",
  });
}