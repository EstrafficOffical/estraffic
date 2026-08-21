import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTwoFactorRequiredForRole } from "@/lib/nexus-2fa";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = String((session?.user as any)?.id || "");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      twoFactor: {
        select: {
          enabled: true,
          confirmedAt: true,
          setupExpiresAt: true,
          recoveryHashes: true,
        },
      },
    },
  });

  if (!user || user.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const now = new Date();

  return NextResponse.json(
    {
      ok: true,
      enabled: Boolean(user.twoFactor?.enabled),
      requiredByRole: isTwoFactorRequiredForRole(user.role),
      confirmedAt: user.twoFactor?.confirmedAt ?? null,
      recoveryCodesRemaining: user.twoFactor?.recoveryHashes.length ?? 0,
      setupPending: Boolean(
        user.twoFactor?.setupExpiresAt &&
          user.twoFactor.setupExpiresAt > now,
      ),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
