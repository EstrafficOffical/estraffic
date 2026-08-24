import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { FlowAccessStatus, RequestStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StaffRole = "OWNER" | "ADMIN" | "MANAGER";

function roleFromSession(session: { user?: { role?: string | null } } | null): StaffRole | null {
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role === "OWNER" || role === "ADMIN" || role === "MANAGER") return role;
  return null;
}

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

async function requireStaff(write = false) {
  const session = await getServerSession(authOptions);
  const role = roleFromSession(session);

  if (!role) {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  if (write && role === "MANAGER") {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { role };
}

export async function GET() {
  const auth = await requireStaff(false);
  if ("error" in auth) return auth.error;

  const requests = await prisma.flowAccessRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          telegram: true,
          tier: true,
          assignedManagerId: true,
        },
      },
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
          termsVersions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const mapped = requests.map((request) => ({
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    processedAt: request.processedAt,
    user: request.user,
    flow: {
      id: request.flow.id,
      name: request.flow.name,
      trafficSource: request.flow.trafficSource,
      approach: request.flow.approach,
      tier: request.flow.tier,
      accessMode: request.flow.accessMode,
      market: request.flow.market,
      latestTerms: request.flow.termsVersions[0]
        ? {
            id: request.flow.termsVersions[0].id,
            version: request.flow.termsVersions[0].version,
            advertiserCpa:
              request.flow.termsVersions[0].advertiserCpa == null
                ? null
                : String(request.flow.termsVersions[0].advertiserCpa),
            affiliateCpa:
              request.flow.termsVersions[0].affiliateCpa == null
                ? null
                : String(request.flow.termsVersions[0].affiliateCpa),
            currency: request.flow.termsVersions[0].currency,
            capFtd: request.flow.termsVersions[0].capFtd,
            minDeposit:
              request.flow.termsVersions[0].minDeposit == null
                ? null
                : String(request.flow.termsVersions[0].minDeposit),
            validationTiming:
              request.flow.termsVersions[0].validationTiming,
            fraudHoldDays:
              request.flow.termsVersions[0].fraudHoldDays,
          }
        : null,
    },
  }));

  return NextResponse.json(
    jsonSafe({
      role: auth.role,
      requests: mapped,
    }),
  );
}

export async function POST(request: Request) {
  const auth = await requireStaff(true);
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const requestId =
    typeof (body as Record<string, unknown>).requestId === "string"
      ? String((body as Record<string, unknown>).requestId)
      : "";

  const decision =
    typeof (body as Record<string, unknown>).decision === "string"
      ? String((body as Record<string, unknown>).decision)
      : "";

  if (!requestId || !["APPROVE", "REJECT"].includes(decision)) {
    return NextResponse.json({ error: "requestId and valid decision are required" }, { status: 400 });
  }

  const accessRequest = await prisma.flowAccessRequest.findUnique({
    where: { id: requestId },
    include: {
      flow: {
        include: {
          termsVersions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!accessRequest) {
    return NextResponse.json({ error: "Access request not found" }, { status: 404 });
  }

  if (accessRequest.status !== RequestStatus.PENDING) {
    return NextResponse.json({ error: "This request has already been processed" }, { status: 409 });
  }

  const now = new Date();

  if (decision === "APPROVE") {
    const latestTerms = accessRequest.flow.termsVersions[0] ?? null;

    await prisma.$transaction([
      prisma.flowAccess.upsert({
        where: {
          userId_flowId: {
            userId: accessRequest.userId,
            flowId: accessRequest.flowId,
          },
        },
        create: {
          userId: accessRequest.userId,
          flowId: accessRequest.flowId,
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
      prisma.flowAccessRequest.update({
        where: { id: accessRequest.id },
        data: {
          status: RequestStatus.APPROVED,
          processedAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
      termsVersionId: latestTerms?.id ?? null,
      termsVersion: latestTerms?.version ?? null,
    });
  }

  await prisma.$transaction([
    prisma.flowAccess.upsert({
      where: {
        userId_flowId: {
          userId: accessRequest.userId,
          flowId: accessRequest.flowId,
        },
      },
      create: {
        userId: accessRequest.userId,
        flowId: accessRequest.flowId,
        status: FlowAccessStatus.REJECTED,
        rejectedAt: now,
      },
      update: {
        termsVersionId: null,
        status: FlowAccessStatus.REJECTED,
        approvedAt: null,
        rejectedAt: now,
        revokedAt: null,
      },
    }),
    prisma.flowAccessRequest.update({
      where: { id: accessRequest.id },
      data: {
        status: RequestStatus.REJECTED,
        processedAt: now,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: "REJECTED" });
}