import bcrypt from "bcryptjs";
import * as QRCode from "qrcode";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTotpUri,
  encryptTwoFactorSecret,
  generateTotpSecret,
  isTwoFactorRequiredForRole,
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
  const currentPassword = String(body?.currentPassword || "");

  if (!currentPassword) {
    return NextResponse.json(
      { ok: false, error: "CURRENT_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!user || user.status !== "APPROVED") {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (!user.passwordHash) {
    return NextResponse.json(
      { ok: false, error: "LOCAL_PASSWORD_REQUIRED" },
      { status: 400 },
    );
  }

  const passwordOk = await bcrypt.compare(
    currentPassword,
    user.passwordHash,
  );

  if (!passwordOk) {
    return NextResponse.json(
      { ok: false, error: "WRONG_PASSWORD" },
      { status: 400 },
    );
  }

  const secret = generateTotpSecret();
  const pendingSecretEnc = encryptTwoFactorSecret(secret);
  const setupExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.nexusTwoFactor.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      enabled: false,
      pendingSecretEnc,
      setupExpiresAt,
    },
    update: {
      pendingSecretEnc,
      setupExpiresAt,
    },
  });

  const otpAuthUri = buildTotpUri(user.email, secret);
  const qrDataUrl = await QRCode.toDataURL(otpAuthUri, {
    width: 260,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return NextResponse.json(
    {
      ok: true,
      qrDataUrl,
      manualKey: secret,
      expiresAt: setupExpiresAt.toISOString(),
      requiredByRole: isTwoFactorRequiredForRole(user.role),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
