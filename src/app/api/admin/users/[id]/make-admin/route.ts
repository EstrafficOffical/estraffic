import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRecentStepUp } from "@/lib/nexus-step-up";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const meId = String(
    (session?.user as any)?.id || "",
  );
  const role = String(
    (session?.user as any)?.role || "",
  );

  if (!meId || role !== "OWNER") {
    return NextResponse.json(
      { error: "OWNER_ONLY" },
      { status: 403 },
    );
  }

  if (!hasRecentStepUp(meId)) {
    return NextResponse.json(
      { error: "STEP_UP_REQUIRED" },
      { status: 428 },
    );
  }

  if (params.id === meId) {
    return NextResponse.json(
      { error: "SELF_ROLE_CHANGE_FORBIDDEN" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      twoFactor: {
        select: {
          enabled: true,
        },
      },
    },
  });

  if (!target) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!target.twoFactor?.enabled) {
    return NextResponse.json(
      {
        error: "TARGET_2FA_REQUIRED",
        message:
          "The target account must enable 2FA before receiving ADMIN access.",
      },
      { status: 409 },
    );
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "STAFF_ROLE_CHANGED",
      userId: meId,
      metadata: {
        targetUserId: params.id,
        fromRole: target.role,
        toRole: "ADMIN",
        source: "legacy_make_admin_route",
      },
    },
  });

  return NextResponse.json({ ok: true });
}
