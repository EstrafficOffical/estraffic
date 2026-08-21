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

  const where: any = {
    createdAt: {
      gte: from,
      lt: to,
    },
  };

  if (!isAll) {
    where.userId = userId;
  }

  const grouped = await prisma.nexusClick.groupBy({
    by: ["flowId"],
    where,
    _count: {
      _all: true,
    },
  });

  const flowIds = grouped.map((row) => String(row.flowId));

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

  const metaById = new Map(flows.map((flow) => [flow.id, flow]));

  const items = grouped.map((row) => {
    const flowId = String(row.flowId);
    const clicks = row._count._all ?? 0;
    const meta = metaById.get(flowId);

    const brand = meta?.market.brand.name ?? "Unknown brand";
    const flowName = meta?.name ?? flowId;
    const geo = meta?.market.geo ?? "";
    const trafficSource = meta?.trafficSource ?? "";

    return {
      offerId: flowId,
      title: `${brand} · ${flowName}`,
      tag: [geo, trafficSource].filter(Boolean).join(" · ") || null,
      clicks,
      conversions: 0,
      revenue: 0,
      epc: 0,
      cr: 0,
      regs: 0,
      deps: 0,
    };
  });

  items.sort((a, b) => b.clicks - a.clicks);

  const top = items.slice(0, limit);

  const totals = top.reduce(
    (acc, item) => {
      acc.clicks += item.clicks;
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
    source: "NexusClick",
  });
}