import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decryptTwoFactorSecret,
  isTwoFactorRequiredForRole,
  recoveryHashMatches,
  verifyTotpCode,
} from "@/lib/nexus-2fa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = String(
    (session?.user as any)?.id || "",
  );

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(
    body?.currentPassword || "",
  );
  const verificationCode = String(
    body?.verificationCode || "",
  ).trim();

  if (!currentPassword || !verificationCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "VERIFICATION_REQUIRED",
      },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      status: true,
      passwordHash: true,
      twoFactor: true,
    },
  });

  if (!user || user.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (isTwoFactorRequiredForRole(user.role)) {
    return NextResponse.json(
      {
        ok: false,
        error: "REQUIRED_BY_ROLE",
      },
      { status: 403 },
    );
  }

  if (
    !user.passwordHash ||
    !user.twoFactor?.enabled ||
    !user.twoFactor.secretEnc
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "TWO_FACTOR_NOT_ENABLED",
      },
      { status: 400 },
    );
  }

  const passwordOk = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordOk) {
    return NextResponse.json(
      {
        ok: false,
        error: "WRONG_PASSWORD",
      },
      { status: 400 },
    );
  }

  let verified = false;

  if (/^\d{6}$/.test(verificationCode)) {
    const secret = decryptTwoFactorSecret(
      user.twoFactor.secretEnc,
    );

    verified = verifyTotpCode(
      secret,
      verificationCode,
    );
  } else {
    verified = user.twoFactor.recoveryHashes.some(
      (hash) =>
        recoveryHashMatches(
          hash,
          verificationCode,
        ),
    );
  }

  if (!verified) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_2FA_CODE",
      },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.nexusTwoFactor.update({
      where: { userId },
      data: {
        enabled: false,
        secretEnc: null,
        pendingSecretEnc: null,
        setupExpiresAt: null,
        recoveryHashes: [],
        confirmedAt: null,
        lastUsedAt: null,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { authVersion: { increment: 1 } },
    }),
    prisma.nexusLoginChallenge.deleteMany({
      where: { userId },
    }),
  ]);

  return NextResponse.json(
    {
      ok: true,
      enabled: false,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
