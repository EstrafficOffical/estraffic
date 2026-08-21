import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decryptTwoFactorSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/nexus-2fa";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = String((session?.user as any)?.id || "");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim();

  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_CODE" },
      { status: 400 },
    );
  }

  const factor = await prisma.nexusTwoFactor.findUnique({
    where: { userId },
  });

  if (
    !factor?.pendingSecretEnc ||
    !factor.setupExpiresAt ||
    factor.setupExpiresAt <= new Date()
  ) {
    return NextResponse.json(
      { ok: false, error: "SETUP_EXPIRED" },
      { status: 400 },
    );
  }

  let secret: string;

  try {
    secret = decryptTwoFactorSecret(factor.pendingSecretEnc);
  } catch (error) {
    console.error("[2FA] pending secret decrypt failed", error);

    return NextResponse.json(
      { ok: false, error: "SETUP_INVALID" },
      { status: 400 },
    );
  }

  if (!verifyTotpCode(secret, code)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_CODE" },
      { status: 400 },
    );
  }

  const recoveryCodes = generateRecoveryCodes(10);
  const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
  const now = new Date();

  await prisma.nexusTwoFactor.update({
    where: { userId },
    data: {
      enabled: true,
      secretEnc: factor.pendingSecretEnc,
      pendingSecretEnc: null,
      setupExpiresAt: null,
      recoveryHashes,
      confirmedAt: now,
      lastUsedAt: now,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      enabled: true,
      recoveryCodes,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
