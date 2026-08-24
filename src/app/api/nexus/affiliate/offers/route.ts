import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import {
  FlowAccessMode,
  FlowAccessStatus,
  RequestStatus,
} from "@prisma/client";
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
      Object.entries(value as Record<string, unknown>).map(
        ([key, child]) => [key, jsonSafe(child)],
      ),
    );
  }

  return value;
}

async function currentAccount() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.trim().toLowerCase();

  if (!email) {
    return {
      error: NextResponse.json(
        { error: "UNAUTHORIZED" },
        { status: 401 },
      ),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      tier: true,
    },
  });

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "ACCOUNT_NOT_FOUND" },
        { status: 401 },
      ),
    };
  }

  return { user };
}

async function resolveFrozenTerms(
  termsVersionId: string | null,
) {
  if (!termsVersionId) return null;

  return prisma.flowTermsVersion.findUnique({
    where: {
      id: termsVersionId,
    },
  });
}
export async function GET() {
  const account = await currentAccount();

  if ("error" in account) {
    return account.error;
  }

  const user = account.user;

  const flows = await prisma.flow.findMany({
    where: {
      status: "ACTIVE",
      tier: { gte: user.tier },
      market: {
        status: "ACTIVE",
        brand: {
          status: "ACTIVE",
          catalogVisibility: "VISIBLE",
        },
      },
    },
    orderBy: [
      { market: { brand: { name: "asc" } } },
      { market: { geo: "asc" } },
      { name: "asc" },
    ],
    include: {
      market: {
        include: {
          brand: true,
        },
      },
      termsVersions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      accesses: {
        where: { userId: user.id },
        take: 1,
      },
      accessRequests: {
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const frozenTermsIds = Array.from(
    new Set(
      flows
        .map((flow) => flow.accesses[0]?.termsVersionId ?? null)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const frozenTermsRows = frozenTermsIds.length
    ? await prisma.flowTermsVersion.findMany({
        where: {
          id: { in: frozenTermsIds },
        },
      })
    : [];

  const frozenTermsById = new Map(
    frozenTermsRows.map((row) => [row.id, row]),
  );

  const visible = await Promise.all(flows
    .filter((flow) => {
      const access = flow.accesses[0];

      if (flow.accessMode !== FlowAccessMode.PRIVATE) {
        return true;
      }

      return access?.status === FlowAccessStatus.APPROVED;
    })
    .map(async (flow) => {
      const latestTerms = flow.termsVersions[0] ?? null;
      const access = flow.accesses[0] ?? null;
      const request = flow.accessRequests[0] ?? null;

      let accessStatus:
        | "NONE"
        | "PENDING"
        | "APPROVED"
        | "REJECTED"
        | "REVOKED" = "NONE";

      if (access?.status === FlowAccessStatus.APPROVED) {
        accessStatus = "APPROVED";
      } else if (
        request?.status === RequestStatus.PENDING ||
        access?.status === FlowAccessStatus.PENDING
      ) {
        accessStatus = "PENDING";
      } else if (request?.status === RequestStatus.REJECTED) {
        accessStatus = "REJECTED";
      } else if (access?.status === FlowAccessStatus.REVOKED) {
        accessStatus = "REVOKED";
      }

      const approved =
        access?.status === FlowAccessStatus.APPROVED;

      const frozenTerms =
        approved && access?.termsVersionId
          ? await resolveFrozenTerms(access.termsVersionId)
          : null;

      const effectiveTerms = approved
        ? frozenTerms
        : latestTerms;

      const affiliateCpa = approved
        ? access?.customAffiliateCpa ??
          frozenTerms?.affiliateCpa ??
          null
        : latestTerms?.affiliateCpa ?? null;

      const affiliateCpaText =
        affiliateCpa == null
          ? null
          : String(affiliateCpa);

      const capFtd = approved
        ? access?.customCapFtd ??
          frozenTerms?.capFtd ??
          null
        : latestTerms?.capFtd ?? null;

      return {
        id: flow.id,
        brand: flow.market.brand.name,
        vertical: flow.market.brand.vertical,
        geo: flow.market.geo,
        marketName: flow.market.name,
        name: flow.name,
        trafficSource: flow.trafficSource,
        approach: flow.approach,
        tier: flow.tier,
        accessMode: flow.accessMode,

        affiliateCpa: affiliateCpaText,
        currency: effectiveTerms?.currency ?? "USD",
        capFtd,
        minDeposit: effectiveTerms?.minDeposit ?? null,
        validationTiming:
          effectiveTerms?.validationTiming ?? null,
        fraudHoldDays: effectiveTerms?.fraudHoldDays ?? null,

        accessStatus,
        approvedTermsVersion: frozenTerms?.version ?? null,
        latestTermsVersion: latestTerms?.version ?? null,
      };
    }));

  return NextResponse.json(
    jsonSafe({
      role: user.role,
      tier: user.tier,
      flows: visible,
    }),
  );
}

export async function POST(request: Request) {
  const account = await currentAccount();

  if ("error" in account) {
    return account.error;
  }

  const user = account.user;

  if (user.role !== "USER") {
    return NextResponse.json(
      { error: "Staff accounts cannot request affiliate access." },
      { status: 403 },
    );
  }

  if (user.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Your affiliate account is not approved." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);

  const flowId =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).flowId === "string"
      ? String((body as Record<string, unknown>).flowId)
      : "";

  if (!flowId) {
    return NextResponse.json(
      { error: "flowId is required" },
      { status: 400 },
    );
  }

  const flow = await prisma.flow.findFirst({
    where: {
      id: flowId,
      status: "ACTIVE",
      tier: { gte: user.tier },
      market: {
        status: "ACTIVE",
        brand: {
          status: "ACTIVE",
          catalogVisibility: "VISIBLE",
        },
      },
    },
    include: {
      termsVersions: {
        orderBy: { version: "desc" },
        take: 1,
      },
      accesses: {
        where: { userId: user.id },
        take: 1,
      },
    },
  });

  if (!flow) {
    return NextResponse.json(
      { error: "Flow is not available for your account." },
      { status: 404 },
    );
  }

  const existingAccess = flow.accesses[0] ?? null;

  if (existingAccess?.status === FlowAccessStatus.APPROVED) {
    return NextResponse.json({
      ok: true,
      status: "APPROVED",
    });
  }

  if (flow.accessMode === FlowAccessMode.PRIVATE) {
    return NextResponse.json(
      { error: "This flow is private." },
      { status: 403 },
    );
  }

  const latestTerms = flow.termsVersions[0] ?? null;

  if (flow.accessMode === FlowAccessMode.OPEN) {
    const now = new Date();

    await prisma.$transaction([
      prisma.flowAccess.upsert({
        where: {
          userId_flowId: {
            userId: user.id,
            flowId: flow.id,
          },
        },
        create: {
          userId: user.id,
          flowId: flow.id,
          termsVersionId: latestTerms?.id ?? null,
          status: FlowAccessStatus.APPROVED,
          approvedAt: now,
        },
        update: {
          termsVersionId: latestTerms?.id ?? null,
          status: FlowAccessStatus.APPROVED,
          approvedAt: now,
          rejectedAt: null,
          revokedAt: null,
        },
      }),
      prisma.flowAccessRequest.upsert({
        where: {
          userId_flowId: {
            userId: user.id,
            flowId: flow.id,
          },
        },
        create: {
          userId: user.id,
          flowId: flow.id,
          status: RequestStatus.APPROVED,
          processedAt: now,
        },
        update: {
          status: RequestStatus.APPROVED,
          processedAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
    });
  }

  await prisma.$transaction([
    prisma.flowAccess.upsert({
      where: {
        userId_flowId: {
          userId: user.id,
          flowId: flow.id,
        },
      },
      create: {
        userId: user.id,
        flowId: flow.id,
        status: FlowAccessStatus.PENDING,
      },
      update: {
        status: FlowAccessStatus.PENDING,
        termsVersionId: null,
        approvedAt: null,
        rejectedAt: null,
        revokedAt: null,
      },
    }),
    prisma.flowAccessRequest.upsert({
      where: {
        userId_flowId: {
          userId: user.id,
          flowId: flow.id,
        },
      },
      create: {
        userId: user.id,
        flowId: flow.id,
        status: RequestStatus.PENDING,
      },
      update: {
        status: RequestStatus.PENDING,
        processedAt: null,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    status: "PENDING",
  });
}