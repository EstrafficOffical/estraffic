import { randomUUID } from "crypto";
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

  const [accesses, links] = await Promise.all([
    prisma.flowAccess.findMany({
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
    }),
    prisma.nexusTrackingLink.findMany({
      where: { userId: user.id },
      select: {
        flowId: true,
        token: true,
      },
    }),
  ]);

  const linkByFlow = new Map(links.map((link) => [link.flowId, link.token]));

  const flows = accesses.map((access) => {
    const token = linkByFlow.get(access.flow.id);

    return {
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
      trackingPath: token ? `/r/nexus/${token}` : null,
      terms: {
        version: access.termsVersion?.version ?? null,
        affiliateCpa: access.customAffiliateCpa ?? access.termsVersion?.affiliateCpa ?? null,
        currency: access.termsVersion?.currency ?? "USD",
        capFtd: access.customCapFtd ?? access.termsVersion?.capFtd ?? null,
        minDeposit: access.termsVersion?.minDeposit ?? null,
        validationTiming: access.termsVersion?.validationTiming ?? null,
        fraudHoldDays: access.termsVersion?.fraudHoldDays ?? null,
      },
    };
  });

  return NextResponse.json(jsonSafe({ flows }));
}

export async function POST(request: Request) {
  const account = await currentUser();
  if ("error" in account) return account.error;

  const user = account.user;

  if (user.role !== "USER" || user.status !== "APPROVED") {
    return NextResponse.json({ error: "Approved affiliate account required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const flowId =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).flowId === "string"
      ? String((body as Record<string, unknown>).flowId)
      : "";

  if (!flowId) {
    return NextResponse.json({ error: "flowId is required" }, { status: 400 });
  }

  const access = await prisma.flowAccess.findUnique({
    where: {
      userId_flowId: {
        userId: user.id,
        flowId,
      },
    },
    include: {
      flow: {
        select: {
          id: true,
          status: true,
          targetUrl: true,
        },
      },
    },
  });

  if (!access || access.status !== FlowAccessStatus.APPROVED) {
    return NextResponse.json({ error: "Approved flow access required" }, { status: 403 });
  }

  if (access.flow.status !== "ACTIVE" || !access.flow.targetUrl) {
    return NextResponse.json({ error: "Tracking target is not configured for this flow" }, { status: 409 });
  }

  const existing = await prisma.nexusTrackingLink.findUnique({
    where: {
      userId_flowId: {
        userId: user.id,
        flowId,
      },
    },
  });

  const link =
    existing ??
    (await prisma.nexusTrackingLink.create({
      data: {
        token: randomUUID().replaceAll("-", ""),
        userId: user.id,
        flowId,
      },
    }));

  return NextResponse.json({
    ok: true,
    trackingPath: `/r/nexus/${link.token}`,
  });
}
