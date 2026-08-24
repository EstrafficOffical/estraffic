import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { session, res } = await requireAdminStepUp();
  if (res) return res;

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      status: true,
      application: { select: { status: true } },
    },
  });

  if (!target) {
    return NextResponse.json(
      { ok: false, error: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (target.role !== "USER") {
    return NextResponse.json(
      { ok: false, error: "USE_TEAM_MANAGEMENT" },
      { status: 409 },
    );
  }

  if (target.status === "APPROVED") {
    return NextResponse.json({ ok: true });
  }

  if (target.application?.status !== "APPROVED") {
    return NextResponse.json(
      {
        ok: false,
        error: "USE_REGISTRATION_REVIEW",
        message:
          "Pending or rejected applications must be reviewed from Registrations.",
      },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      status: "APPROVED",
      authVersion: { increment: 1 },
    },
  });

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "AFFILIATE_REACTIVATED",
      userId: session!.user.id,
      metadata: {
        targetUserId: target.id,
        source: "legacy_users_approve",
      },
    },
  });

  return NextResponse.json({ ok: true });
}