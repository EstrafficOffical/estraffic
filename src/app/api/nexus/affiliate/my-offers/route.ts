import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { FlowAccessStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function jsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);

  if (typeof value === "object") {
    if (
      "toString" in (value as Record<string, unknown>) &&
      value?.constructor?.name === "Decimal"
    ) {
      return String(value);
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, jsonSafe(child)]),
    );
  }

  return value;
}

async function currentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    return { error: NextResponse.json({ error: "ACCOUNT_NOT_FOUND" }, { status: 401 }) };
  }

  return { user };
}

export async function GET() {
  const account = await currentUser();
  if ("error" in account) return account.error;

  const user = account.user;

  const accesses = await prisma.flowAccess.findMany({
    where: {
      userId: user.id,
      status: FlowAccessStatus.APPROVED,
    },
    orderBy: {
      approvedAt: "desc",
    },
    include: {
      termsVersion: true,
      flow: {
        include: {
          market: {
            include: {
              brand: {
                select: {
                  name: true,
                  vertical: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const flows = accesses.map((access) => ({
    accessId: access.id,
    approvedAt: access.approvedAt,
    brand: access.flow.market.brand.name,
    vertical: access.flow.market.brand.vertical,
    geo: access.flow.market.geo,
    flowId: access.flow.id,
    flowName: access.flow.name,
    trafficSource: access.flow.trafficSource,
    approach: access.flow.approach,
    tier: access.flow.tier,
    targetUrl: access.flow.targetUrl,
    trackingTemplate: access.flow.trackingTemplate,
    terms: {
      version: access.termsVersion?.version ?? null,
      affiliateCpa: access.customAffiliateCpa ?? access.termsVersion?.affiliateCpa ?? null,
      currency: access.termsVersion?.currency ?? "USD",
      capFtd: access.customCapFtd ?? access.termsVersion?.capFtd ?? null,
      minDeposit: access.termsVersion?.minDeposit ?? null,
      validationTiming: access.termsVersion?.validationTiming ?? null,
      fraudHoldDays: access.termsVersion?.fraudHoldDays ?? null,
    },
  }));

  return NextResponse.json(
    jsonSafe({
      flows,
    }),
  );
}