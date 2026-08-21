import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type StaffRole = "OWNER" | "ADMIN" | "MANAGER";

function staffRole(
  session: { user?: { role?: string | null } } | null,
): StaffRole | null {
  const role = session?.user?.role;
  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER") {
    return role;
  }
  return null;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  const rawSession = await getServerSession(authOptions);
  const session = rawSession as { user?: { role?: string | null } } | null;
  const role = staffRole(session);

  if (!role) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const conversions = await prisma.nexusConversion.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      clickId: true,
      nexusClickId: true,
      userId: true,
      flowId: true,
      termsVersionId: true,
      type: true,
      status: true,
      source: true,
      txId: true,
      externalId: true,
      advertiserAmount: true,
      affiliatePayout: true,
      currency: true,
      eventAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const userIds = Array.from(new Set(conversions.map((x) => x.userId)));
  const flowIds = Array.from(new Set(conversions.map((x) => x.flowId)));
  const termsIds = Array.from(
    new Set(
      conversions
        .map((x) => x.termsVersionId)
        .filter((x): x is string => Boolean(x)),
    ),
  );

  const [users, flows, terms] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            name: true,
            tier: true,
          },
        })
      : [],

    flowIds.length
      ? prisma.flow.findMany({
          where: { id: { in: flowIds } },
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
        })
      : [],

    termsIds.length
      ? prisma.flowTermsVersion.findMany({
          where: { id: { in: termsIds } },
          select: {
            id: true,
            version: true,
          },
        })
      : [],
  ]);

  const userById = new Map(users.map((x) => [x.id, x]));
  const flowById = new Map(flows.map((x) => [x.id, x]));
  const termsById = new Map(terms.map((x) => [x.id, x]));

  const showInternal = role === "OWNER" || role === "ADMIN";

  const items = conversions.map((conversion) => {
    const advertiserAmount = numberOrNull(conversion.advertiserAmount);
    const affiliatePayout = Number(conversion.affiliatePayout || 0);
    const grossMargin =
      advertiserAmount == null ? null : advertiserAmount - affiliatePayout;
    const marginPercent =
      advertiserAmount != null && advertiserAmount > 0 && grossMargin != null
        ? (grossMargin / advertiserAmount) * 100
        : null;

    const flow = flowById.get(conversion.flowId);
    const user = userById.get(conversion.userId);
    const termsVersion = conversion.termsVersionId
      ? termsById.get(conversion.termsVersionId)
      : null;

    return {
      id: conversion.id,
      createdAt: conversion.createdAt.toISOString(),
      eventAt: conversion.eventAt?.toISOString() ?? null,
      updatedAt: conversion.updatedAt.toISOString(),

      type: conversion.type,
      status: conversion.status,
      source: conversion.source,
      txId: conversion.txId,
      externalId: conversion.externalId,
      clickId: conversion.clickId,
      nexusClickId: conversion.nexusClickId,

      currency: conversion.currency,
      advertiserAmount: showInternal ? advertiserAmount : null,
      affiliatePayout,
      grossMargin: showInternal ? grossMargin : null,
      marginPercent: showInternal ? marginPercent : null,

      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            tier: user.tier,
          }
        : {
            id: conversion.userId,
            email: null,
            name: null,
            tier: null,
          },

      flow: flow
        ? {
            id: flow.id,
            name: flow.name,
            trafficSource: flow.trafficSource,
            approach: flow.approach,
            geo: flow.market.geo,
            brand: {
              id: flow.market.brand.id,
              name: flow.market.brand.name,
            },
          }
        : {
            id: conversion.flowId,
            name: conversion.flowId,
            trafficSource: null,
            approach: null,
            geo: null,
            brand: null,
          },

      terms: termsVersion
        ? {
            id: termsVersion.id,
            version: termsVersion.version,
          }
        : conversion.termsVersionId
          ? {
              id: conversion.termsVersionId,
              version: null,
            }
          : null,
    };
  });

  return NextResponse.json({
    role,
    items,
  });
}