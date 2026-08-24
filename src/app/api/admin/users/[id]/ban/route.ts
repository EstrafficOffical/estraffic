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

  const meId = String(session!.user.id || "");

  if (params.id === meId) {
    return NextResponse.json(
      { ok: false, error: "SELF_BAN_FORBIDDEN" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, status: true },
  });

  if (!target) {
    return NextResponse.json(
      { ok: false, error: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (target.role !== "USER") {
    return NextResponse.json(
      {
        ok: false,
        error: "USE_TEAM_MANAGEMENT",
        message: "Staff accounts must be suspended from Team & Roles.",
      },
      { status: 409 },
    );
  }

  if (target.status === "BANNED") {
    return NextResponse.json({ ok: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: {
        status: "BANNED",
        authVersion: { increment: 1 },
      },
    }),
    prisma.nexusLoginChallenge.deleteMany({
      where: { userId: target.id },
    }),
  ]);

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "AFFILIATE_BANNED",
      userId: meId,
      metadata: {
        targetUserId: target.id,
        source: "legacy_users_ban",
      },
    },
  });

  return NextResponse.json({ ok: true });
}