import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRecentStepUp } from "@/lib/nexus-step-up";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  const meRole = String(
    (session?.user as any)?.role || "",
  );
  const meId = String(
    (session?.user as any)?.id || "",
  );

  if (
    !session?.user ||
    !["OWNER", "ADMIN"].includes(meRole)
  ) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 },
    );
  }

  if (!hasRecentStepUp(meId)) {
    return NextResponse.json(
      { error: "STEP_UP_REQUIRED" },
      { status: 428 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      role: true,
      status: true,
      twoFactor: {
        select: {
          enabled: true,
        },
      },
    },
  });

  if (!target) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 },
    );
  }

  const body = await req
    .json()
    .catch(() => ({}));

  const action = String(body.action || "");

  if (
    meRole === "ADMIN" &&
    target.role !== "MANAGER" &&
    !(
      target.role === "USER" &&
      body.role === "MANAGER"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "ADMIN may only manage MANAGER accounts",
      },
      { status: 403 },
    );
  }

  if (action === "set-role") {
    const next = String(body.role || "");

    if (
      !["MANAGER", "ADMIN", "OWNER"].includes(
        next,
      )
    ) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 },
      );
    }

    if (
      meRole !== "OWNER" &&
      next !== "MANAGER"
    ) {
      return NextResponse.json(
        {
          error:
            "Only OWNER can grant ADMIN/OWNER",
        },
        { status: 403 },
      );
    }

    if (params.id === meId) {
      return NextResponse.json(
        {
          error:
            "You cannot change your own role here",
        },
        { status: 400 },
      );
    }

    if (
      ["ADMIN", "OWNER"].includes(next) &&
      !target.twoFactor?.enabled
    ) {
      return NextResponse.json(
        {
          error:
            "TARGET_2FA_REQUIRED",
          message:
            "The target account must enable 2FA before receiving ADMIN or OWNER access.",
        },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        role: next as any,
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
          toRole: next,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (
    action === "suspend" ||
    action === "reactivate"
  ) {
    if (params.id === meId) {
      return NextResponse.json(
        {
          error:
            "You cannot suspend your own account",
        },
        { status: 400 },
      );
    }

    if (
      target.role === "OWNER" &&
      action === "suspend"
    ) {
      const activeOwners =
        await prisma.user.count({
          where: {
            role: "OWNER",
            status: "APPROVED",
          },
        });

      if (activeOwners <= 1) {
        return NextResponse.json(
          {
            error:
              "Cannot suspend the final active OWNER",
          },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        status:
          action === "suspend"
            ? "SUSPENDED"
            : "APPROVED",
      },
    });

    await prisma.nexusSecurityEvent.create({
      data: {
        eventType:
          action === "suspend"
            ? "STAFF_SUSPENDED"
            : "STAFF_REACTIVATED",
        userId: meId,
        metadata: {
          targetUserId: params.id,
          targetRole: target.role,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "remove-staff") {
    if (meRole !== "OWNER") {
      return NextResponse.json(
        {
          error:
            "Only OWNER can remove staff access",
        },
        { status: 403 },
      );
    }

    if (params.id === meId) {
      return NextResponse.json(
        {
          error:
            "You cannot remove your own staff access",
        },
        { status: 400 },
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
              "Cannot remove the final active OWNER",
          },
          { status: 400 },
        );
      }
    }

    await prisma.user.update({
      where: { id: params.id },
      data: {
        role: "USER",
        tier: 3,
        assignedManagerId: null,
      },
    });

    await prisma.nexusSecurityEvent.create({
      data: {
        eventType: "STAFF_ACCESS_REMOVED",
        userId: meId,
        metadata: {
          targetUserId: params.id,
          fromRole: target.role,
        },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { error: "Unknown action" },
    { status: 400 },
  );
}
