// src/app/api/stats/by-offer/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireApproved } from "@/lib/api-guards";

function parseRange(url: URL) {
  const to = url.searchParams.get("to")
    ? new Date(url.searchParams.get("to")!)
    : new Date();

  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 3600 * 1000);

  const limit = Math.min(
    200,
    Math.max(1, Number(url.searchParams.get("limit") ?? 50)),
  );

  return { from, to, limit };
}

export async function GET(req: Request) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const url = new URL(req.url);
  const { from, to, limit } = parseRange(url);

  const userId = String((session!.user as any).id);
  const role = String((session!.user as any).role ?? "USER");

  const isAll =
    url.searchParams.get("all") === "1" &&
    (role === "ADMIN" || role === "OWNER");

  const clickWhere: any = {
    createdAt: {
      gte: from,
      lt: to,
    },
  };

  const conversionWhere: any = {
    status: "APPROVED",
    createdAt: {
      gte: from,
      lt: to,
    },
  };

  if (!isAll) {
    clickWhere.userId = userId;
    conversionWhere.userId = userId;
  }

  const [clickRows, conversionRows] = await Promise.all([
    prisma.nexusClick.groupBy({
      by: ["flowId"],
      where: clickWhere,
      _count: {
        _all: true,
      },
    }),

    prisma.nexusConversion.groupBy({
      by: ["flowId", "type"],
      where: conversionWhere,
      _count: {
        _all: true,
      },
      _sum: {
        affiliatePayout: true,
      },
    }),
  ]);

  const flowIds = Array.from(
    new Set([
      ...clickRows.map((row) => String(row.flowId)),
      ...conversionRows.map((row) => String(row.flowId)),
    ]),
  );

  const flows = flowIds.length
    ? await prisma.flow.findMany({
        where: {
          id: {
            in: flowIds,
          },
        },
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
                  name: true,
                  vertical: true,
                },
              },
            },
          },
        },
      })
    : [];

  const flowMeta = new Map(flows.map((flow) => [flow.id, flow]));
  const clicksByFlow = new Map(
    clickRows.map((row) => [String(row.flowId), row._count._all ?? 0]),
  );

  type Acc = {
    regs: number;
    deps: number;
    conversions: number;
    revenue: number;
  };

  const conversionsByFlow = new Map<string, Acc>();

  for (const row of conversionRows) {
    const flowId = String(row.flowId);
    const acc = conversionsByFlow.get(flowId) ?? {
      regs: 0,
      deps: 0,
      conversions: 0,
      revenue: 0,
    };

    const count = row._count._all ?? 0;

    acc.conversions += count;
    acc.revenue += Number(row._sum.affiliatePayout ?? 0);

    if (row.type === "REG") acc.regs += count;
    if (row.type === "DEP") acc.deps += count;

    conversionsByFlow.set(flowId, acc);
  }

  const items = flowIds.map((flowId) => {
    const meta = flowMeta.get(flowId);
    const clicks = clicksByFlow.get(flowId) ?? 0;
    const acc = conversionsByFlow.get(flowId) ?? {
      regs: 0,
      deps: 0,
      conversions: 0,
      revenue: 0,
    };

    const brand = meta?.market.brand.name ?? "Unknown brand";
    const flowName = meta?.name ?? flowId;
    const geo = meta?.market.geo ?? "";
    const trafficSource = meta?.trafficSource ?? "";

    return {
      // Frontend compatibility: this is a flow ID, despite the legacy key name.
      offerId: flowId,
      title: `${brand} · ${flowName}`,
      tag: [geo, trafficSource].filter(Boolean).join(" · ") || null,
      clicks,
      conversions: acc.conversions,
      revenue: acc.revenue,
      epc: clicks > 0 ? acc.revenue / clicks : 0,
      cr: clicks > 0 ? acc.conversions / clicks : 0,
      regs: acc.regs,
      deps: acc.deps,
    };
  });

  items.sort(
    (a, b) =>
      b.revenue - a.revenue ||
      b.conversions - a.conversions ||
      b.clicks - a.clicks,
  );

  const top = items.slice(0, limit);

  const totals = top.reduce(
    (acc, item) => {
      acc.clicks += item.clicks;
      acc.conversions += item.conversions;
      acc.revenue += item.revenue;
      acc.regs += item.regs;
      acc.deps += item.deps;
      return acc;
    },
    {
      clicks: 0,
      conversions: 0,
      revenue: 0,
      regs: 0,
      deps: 0,
    },
  );

  return NextResponse.json({
    from,
    to,
    items: top,
    totals,
    scope: isAll ? "ALL" : "OWN",
    source: "NexusClick+NexusConversion",
  });
}