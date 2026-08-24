import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRecentStepUp } from "@/lib/nexus-step-up";

export async function POST(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

  if (!(await hasRecentStepUp(meId))) {
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
      status: true,
    },
  });

  if (!target) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (target.role === "OWNER") {
    const owners = await prisma.user.count({
      where: {
        role: "OWNER",
        status: "APPROVED",
      },
    });

    if (owners <= 1) {
      return NextResponse.json(
        {
          error:
            "CANNOT_DEMOTE_FINAL_OWNER",
        },
        { status: 409 },
      );
    }
  }

  await prisma.user.update({
    where: { id: params.id },
    data: {
      role: "USER",
      tier: 3,
      assignedManagerId: null,
      authVersion: { increment: 1 },
    },
  });

  await prisma.nexusSecurityEvent.create({
    data: {
      eventType: "STAFF_ROLE_CHANGED",
      userId: meId,
      metadata: {
        targetUserId: params.id,
        fromRole: target.role,
        toRole: "USER",
        source: "legacy_make_user_route",
      },
    },
  });

  return NextResponse.json({ ok: true });
}
