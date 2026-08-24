import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(
  data: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  req: Request,
  props: {
    params: Promise<{ id: string }>;
  },
) {
  const { session, res } = await requireAdminStepUp();
  if (res) return res;

  const { id } = await props.params;
  const actorId = String((session?.user as any)?.id || "");

  const body = await req.json().catch(() => ({}));
  const rawManagerId = body?.managerId;
  const managerId =
    rawManagerId === null ||
    rawManagerId === undefined ||
    String(rawManagerId).trim() === ""
      ? null
      : String(rawManagerId).trim();

  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      status: true,
      assignedManagerId: true,
    },
  });

  if (!target) {
    return json(
      { ok: false, error: "AFFILIATE_NOT_FOUND" },
      404,
    );
  }

  if (target.role !== "USER") {
    return json(
      {
        ok: false,
        error: "TARGET_IS_NOT_AFFILIATE",
      },
      409,
    );
  }

  if (managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: managerId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (
      !manager ||
      manager.status !== "APPROVED" ||
      !["MANAGER", "ADMIN", "OWNER"].includes(manager.role)
    ) {
      return json(
        {
          ok: false,
          error: "MANAGER_NOT_ACTIVE_STAFF",
        },
        400,
      );
    }
  }

  const previousManagerId = target.assignedManagerId;

  if (previousManagerId === managerId) {
    return json({
      ok: true,
      unchanged: true,
      managerId,
    });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      assignedManagerId: managerId,
    },
    select: {
      id: true,
      assignedManagerId: true,
      assignedManager: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "AFFILIATE_MANAGER_CHANGED",
      userId: actorId || null,
      metadata: {
        targetUserId: id,
        previousManagerId,
        nextManagerId: managerId,
      },
    },
  });

  return json({
    ok: true,
    affiliate: updated,
  });
}