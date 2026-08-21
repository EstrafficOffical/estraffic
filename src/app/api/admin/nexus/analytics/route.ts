import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type StaffRole = "OWNER" | "ADMIN";

type Filters = {
  from: Date;
  to: Date;
  affiliateId?: string;
  brandId?: string;
  geo?: string;
  flowId?: string;
  source?: string;
};

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function asRole(session: { user?: { role?: string | null } } | null): StaffRole | null {
  const role = session?.user?.role;
  return role === "OWNER" || role === "ADMIN" ? role : null;
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function dayKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const rawSession = await getServerSession(authOptions);
  const session = rawSession as { user?: { role?: string | null } } | null;
  const role = asRole(session);

  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 29);
  defaultFrom.setUTCHours(0, 0, 0, 0);

  const defaultTo = new Date(now);
  defaultTo.setUTCHours(23, 59, 59, 999);

  const filters: Filters = {
    from: parseDate(url.searchParams.get("from"), defaultFrom),
    to: parseDate(url.searchParams.get("to"), defaultTo),
    affiliateId: url.searchParams.get("affiliateId") || undefined,
    brandId: url.searchParams.get("brandId") || undefined,
    geo: url.searchParams.get("geo") || undefined,
    flowId: url.searchParams.get("flowId") || undefined,
    source: url.searchParams.get("source") || undefined,
  };

  const flowRows = await prisma.flow.findMany({
    select: {
      id: true,
      name: true,
      trafficSource: true,
      approach: true,
      market: {
        select: {
          geo: true,
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { market: { brand: { name: "asc" } } },
      { market: { geo: "asc" } },
      { name: "asc" },
    ],
  });

  const flowById = new Map(flowRows.map((flow) => [flow.id, flow]));

  const eligibleFlowIds = flowRows
    .filter((flow) => {
      if (filters.flowId && flow.id !== filters.flowId) return false;
      if (filters.brandId && flow.market.brand.id !== filters.brandId) return false;
      if (filters.geo && flow.market.geo !== filters.geo) return false;
      if (filters.source && flow.trafficSource !== filters.source) return false;
      return true;
    })
    .map((flow) => flow.id);

  const hasDimensionFilter =
    Boolean(filters.flowId) ||
    Boolean(filters.brandId) ||
    Boolean(filters.geo) ||
    Boolean(filters.source);

  const clickWhere: any = {
    createdAt: {
      gte: filters.from,
      lte: filters.to,
    },
  };

  const conversionWhere: any = {
    createdAt: {
      gte: filters.from,
      lte: filters.to,
    },
  };

  if (filters.affiliateId) {
    clickWhere.userId = filters.affiliateId;
    conversionWhere.userId = filters.affiliateId;
  }

  if (hasDimensionFilter) {
    clickWhere.flowId = { in: eligibleFlowIds };
    conversionWhere.flowId = { in: eligibleFlowIds };
  }

  const [clicks, conversions, affiliates] = await Promise.all([
    prisma.nexusClick.findMany({
      where: clickWhere,
      select: {
        id: true,
        userId: true,
        flowId: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50000,
    }),

    prisma.nexusConversion.findMany({
      where: conversionWhere,
      select: {
        id: true,
        userId: true,
        flowId: true,
        type: true,
        status: true,
        advertiserAmount: true,
        affiliatePayout: true,
        currency: true,
        createdAt: true,
        clickId: true,
        txId: true,
        source: true,
        termsVersionId: true,
      },
      orderBy: { createdAt: "asc" },
      take: 50000,
    }),

    prisma.user.findMany({
      where: {
        role: "USER",
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        tier: true,
      },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  const affiliateById = new Map(affiliates.map((user) => [user.id, user]));

  type Bucket = {
    key: string;
    affiliateId?: string;
    flowId?: string;
    clicks: number;
    regs: number;
    ftd: number;
    conversions: number;
    advertiserRevenue: number;
    affiliatePayouts: number;
  };

  function emptyBucket(key: string): Bucket {
    return {
      key,
      clicks: 0,
      regs: 0,
      ftd: 0,
      conversions: 0,
      advertiserRevenue: 0,
      affiliatePayouts: 0,
    };
  }

  const byAffiliate = new Map<string, Bucket>();
  const byFlow = new Map<string, Bucket>();
  const byDay = new Map<string, Bucket>();

  for (const click of clicks) {
    const affiliate = byAffiliate.get(click.userId) ?? emptyBucket(click.userId);
    affiliate.affiliateId = click.userId;
    affiliate.clicks += 1;
    byAffiliate.set(click.userId, affiliate);

    const flow = byFlow.get(click.flowId) ?? emptyBucket(click.flowId);
    flow.flowId = click.flowId;
    flow.clicks += 1;
    byFlow.set(click.flowId, flow);

    const day = dayKey(click.createdAt);
    const dayBucket = byDay.get(day) ?? emptyBucket(day);
    dayBucket.clicks += 1;
    byDay.set(day, dayBucket);
  }

  for (const conversion of conversions) {
    const affiliate = byAffiliate.get(conversion.userId) ?? emptyBucket(conversion.userId);
    affiliate.affiliateId = conversion.userId;
    affiliate.conversions += 1;

    const flow = byFlow.get(conversion.flowId) ?? emptyBucket(conversion.flowId);
    flow.flowId = conversion.flowId;
    flow.conversions += 1;

    const day = dayKey(conversion.createdAt);
    const dayBucket = byDay.get(day) ?? emptyBucket(day);
    dayBucket.conversions += 1;

    if (conversion.status === "APPROVED") {
      if (conversion.type === "REG") {
        affiliate.regs += 1;
        flow.regs += 1;
        dayBucket.regs += 1;
      }

      if (conversion.type === "DEP") {
        affiliate.ftd += 1;
        flow.ftd += 1;
        dayBucket.ftd += 1;
      }

      const advertiserRevenue = num(conversion.advertiserAmount);
      const affiliatePayout = num(conversion.affiliatePayout);

      affiliate.advertiserRevenue += advertiserRevenue;
      affiliate.affiliatePayouts += affiliatePayout;

      flow.advertiserRevenue += advertiserRevenue;
      flow.affiliatePayouts += affiliatePayout;

      dayBucket.advertiserRevenue += advertiserRevenue;
      dayBucket.affiliatePayouts += affiliatePayout;
    }

    byAffiliate.set(conversion.userId, affiliate);
    byFlow.set(conversion.flowId, flow);
    byDay.set(day, dayBucket);
  }

  const sum = <T,>(items: T[], selector: (item: T) => number) =>
    items.reduce((total, item) => total + selector(item), 0);

  const advertiserRevenue = sum(conversions, (conversion) =>
    conversion.status === "APPROVED" ? num(conversion.advertiserAmount) : 0,
  );

  const affiliatePayouts = sum(conversions, (conversion) =>
    conversion.status === "APPROVED" ? num(conversion.affiliatePayout) : 0,
  );

  const grossMargin = advertiserRevenue - affiliatePayouts;

  const approvedRegs = conversions.filter(
    (conversion) =>
      conversion.status === "APPROVED" && conversion.type === "REG",
  ).length;

  const approvedFtd = conversions.filter(
    (conversion) =>
      conversion.status === "APPROVED" && conversion.type === "DEP",
  ).length;

  const affiliateRows = Array.from(byAffiliate.values())
    .map((bucket) => {
      const user = bucket.affiliateId
        ? affiliateById.get(bucket.affiliateId)
        : undefined;
      const gross = bucket.advertiserRevenue - bucket.affiliatePayouts;

      return {
        affiliateId: bucket.affiliateId ?? bucket.key,
        name: user?.name ?? null,
        email: user?.email ?? bucket.affiliateId ?? bucket.key,
        tier: user?.tier ?? null,
        clicks: bucket.clicks,
        regs: bucket.regs,
        ftd: bucket.ftd,
        conversions: bucket.conversions,
        clickToReg: bucket.clicks > 0 ? bucket.regs / bucket.clicks : 0,
        regToFtd: bucket.regs > 0 ? bucket.ftd / bucket.regs : 0,
        advertiserRevenue: bucket.advertiserRevenue,
        affiliatePayouts: bucket.affiliatePayouts,
        grossMargin: gross,
        marginPercent:
          bucket.advertiserRevenue > 0
            ? gross / bucket.advertiserRevenue
            : 0,
      };
    })
    .sort((a, b) => b.advertiserRevenue - a.advertiserRevenue || b.ftd - a.ftd);

  const flowRowsOut = Array.from(byFlow.values())
    .map((bucket) => {
      const flow = bucket.flowId ? flowById.get(bucket.flowId) : undefined;
      const gross = bucket.advertiserRevenue - bucket.affiliatePayouts;

      return {
        flowId: bucket.flowId ?? bucket.key,
        flowName: flow?.name ?? bucket.flowId ?? bucket.key,
        brandId: flow?.market.brand.id ?? null,
        brandName: flow?.market.brand.name ?? "Unknown brand",
        geo: flow?.market.geo ?? null,
        trafficSource: flow?.trafficSource ?? null,
        approach: flow?.approach ?? null,
        clicks: bucket.clicks,
        regs: bucket.regs,
        ftd: bucket.ftd,
        conversions: bucket.conversions,
        clickToReg: bucket.clicks > 0 ? bucket.regs / bucket.clicks : 0,
        regToFtd: bucket.regs > 0 ? bucket.ftd / bucket.regs : 0,
        advertiserRevenue: bucket.advertiserRevenue,
        affiliatePayouts: bucket.affiliatePayouts,
        grossMargin: gross,
        marginPercent:
          bucket.advertiserRevenue > 0
            ? gross / bucket.advertiserRevenue
            : 0,
      };
    })
    .sort((a, b) => b.advertiserRevenue - a.advertiserRevenue || b.ftd - a.ftd);

  const series: Array<{
    day: string;
    clicks: number;
    regs: number;
    ftd: number;
    conversions: number;
    advertiserRevenue: number;
    affiliatePayouts: number;
    grossMargin: number;
  }> = [];

  const rangeStart = new Date(filters.from);
  rangeStart.setUTCHours(0, 0, 0, 0);

  const rangeEnd = new Date(filters.to);
  rangeEnd.setUTCHours(0, 0, 0, 0);

  // Keep the chart bounded even if somebody selects a huge custom range.
  const maxChartDays = 366;
  let chartDays = 0;

  for (
    let cursor = new Date(rangeStart);
    cursor <= rangeEnd && chartDays < maxChartDays;
    cursor.setUTCDate(cursor.getUTCDate() + 1), chartDays += 1
  ) {
    const day = dayKey(cursor);
    const bucket = byDay.get(day) ?? emptyBucket(day);

    series.push({
      day,
      clicks: bucket.clicks,
      regs: bucket.regs,
      ftd: bucket.ftd,
      conversions: bucket.conversions,
      advertiserRevenue: bucket.advertiserRevenue,
      affiliatePayouts: bucket.affiliatePayouts,
      grossMargin: bucket.advertiserRevenue - bucket.affiliatePayouts,
    });
  }

  const recentActivity = conversions
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)
    .map((conversion) => {
      const user = affiliateById.get(conversion.userId);
      const flow = flowById.get(conversion.flowId);
      const advertiser = num(conversion.advertiserAmount);
      const payout = num(conversion.affiliatePayout);

      return {
        id: conversion.id,
        createdAt: conversion.createdAt.toISOString(),
        affiliateId: conversion.userId,
        affiliate: user?.name ?? user?.email ?? conversion.userId,
        email: user?.email ?? null,
        brand: flow?.market.brand.name ?? "Unknown brand",
        geo: flow?.market.geo ?? null,
        flow: flow?.name ?? conversion.flowId,
        trafficSource: flow?.trafficSource ?? null,
        type: conversion.type,
        status: conversion.status,
        advertiserRevenue:
          conversion.status === "APPROVED" ? advertiser : 0,
        affiliatePayout:
          conversion.status === "APPROVED" ? payout : 0,
        grossMargin:
          conversion.status === "APPROVED" ? advertiser - payout : 0,
        currency: conversion.currency,
        txId: conversion.txId,
        clickId: conversion.clickId,
      };
    });

  const brands = Array.from(
    new Map(
      flowRows.map((flow) => [
        flow.market.brand.id,
        {
          id: flow.market.brand.id,
          name: flow.market.brand.name,
        },
      ]),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const geos = Array.from(
    new Set(flowRows.map((flow) => flow.market.geo).filter(Boolean)),
  ).sort();

  const sources = Array.from(
    new Set(flowRows.map((flow) => flow.trafficSource).filter(Boolean)),
  ).sort();

  return NextResponse.json({
    role,
    range: {
      from: filters.from.toISOString(),
      to: filters.to.toISOString(),
    },
    metrics: {
      clicks: clicks.length,
      conversions: conversions.length,
      regs: approvedRegs,
      ftd: approvedFtd,
      advertiserRevenue,
      affiliatePayouts,
      grossMargin,
      marginPercent:
        advertiserRevenue > 0 ? grossMargin / advertiserRevenue : 0,
      epc: clicks.length > 0 ? affiliatePayouts / clicks.length : 0,
    },
    affiliateRows,
    flowRows: flowRowsOut,
    series,
    recentActivity,
    options: {
      affiliates,
      brands,
      geos,
      flows: flowRows.map((flow) => ({
        id: flow.id,
        name: flow.name,
        brandId: flow.market.brand.id,
        brandName: flow.market.brand.name,
        geo: flow.market.geo,
        trafficSource: flow.trafficSource,
      })),
      sources,
    },
  });
}