import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createStepUpToken,
  stepUpCookieName,
  stepUpCookieOptions,
} from "@/lib/nexus-step-up";
import {
  decryptTwoFactorSecret,
  recoveryHashMatches,
  verifyTotpCode,
} from "@/lib/nexus-2fa";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
} from "@/lib/nexus-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await auth();
  const userId = String(
    (session?.user as any)?.id || "",
  );

  if (!userId) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
      },
      {
        status: 401,
      },
    );
  }

  const ipLimit = await checkRateLimit({
    scope: "step-up-ip",
    identifier: clientIp(req),
    limit: 20,
    windowSeconds: 10 * 60,
  });

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "TOO_MANY_ATTEMPTS",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(ipLimit),
      },
    );
  }

  const userLimit = await checkRateLimit({
    scope: "step-up-user",
    identifier: userId,
    limit: 8,
    windowSeconds: 10 * 60,
  });

  if (!userLimit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "TOO_MANY_ATTEMPTS",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(userLimit),
      },
    );
  }

  const body = await req
    .json()
    .catch(() => ({}));

  const verificationCode = String(
    body?.verificationCode || "",
  ).trim();

  if (!verificationCode) {
    return NextResponse.json(
      {
        ok: false,
        error: "CODE_REQUIRED",
      },
      {
        status: 400,
      },
    );
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      status: true,
      twoFactor: true,
    },
  });

  if (
    !user ||
    user.status !== "APPROVED" ||
    !user.twoFactor?.enabled ||
    !user.twoFactor.secretEnc
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "TWO_FACTOR_REQUIRED",
      },
      {
        status: 403,
      },
    );
  }

  const now = new Date();
  let verified = false;
  let usedRecovery = false;

  if (/^\d{6}$/.test(verificationCode)) {
    const secret =
      decryptTwoFactorSecret(
        user.twoFactor.secretEnc,
      );

    verified = verifyTotpCode(
      secret,
      verificationCode,
    );

    if (verified) {
      await prisma.$transaction([
        prisma.nexusTwoFactor.update({
          where: {
            userId,
          },
          data: {
            lastUsedAt: now,
          },
        }),
        prisma.nexusSecurityEvent.create({
          data: {
            eventType:
              "STEP_UP_GRANTED",
            userId,
            metadata: {
              method: "totp",
              role: user.role,
              ttlSeconds: 600,
            },
          },
        }),
      ]);
    }
  } else {
    const recoveryIndex =
      user.twoFactor.recoveryHashes.findIndex(
        (hash) =>
          recoveryHashMatches(
            hash,
            verificationCode,
          ),
      );

    if (recoveryIndex >= 0) {
      const recoveryHash =
        user.twoFactor
          .recoveryHashes[
            recoveryIndex
          ];

      verified =
        await prisma.$transaction(
          async (tx) => {
            const current =
              await tx.nexusTwoFactor.findUnique(
                {
                  where: {
                    userId,
                  },
                },
              );

            if (!current?.enabled) {
              return false;
            }

            const currentIndex =
              current.recoveryHashes.findIndex(
                (hash) =>
                  hash ===
                  recoveryHash,
              );

            if (currentIndex < 0) {
              return false;
            }

            const remaining =
              current.recoveryHashes.filter(
                (_, index) =>
                  index !==
                  currentIndex,
              );

            await tx.nexusTwoFactor.update({
              where: {
                userId,
              },
              data: {
                recoveryHashes:
                  remaining,
                lastUsedAt: now,
              },
            });

            await tx.nexusSecurityEvent.create({
              data: {
                eventType:
                  "STEP_UP_GRANTED",
                userId,
                metadata: {
                  method:
                    "recovery_code",
                  role: user.role,
                  ttlSeconds: 600,
                },
              },
            });

            return true;
          },
          {
            isolationLevel:
              "Serializable",
          },
        );

      usedRecovery = verified;
    }
  }

  if (!verified) {
    await prisma.nexusSecurityEvent.create({
      data: {
        eventType:
          "STEP_UP_DENIED",
        userId,
        metadata: {
          role: user.role,
        },
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_CODE",
      },
      {
        status: 401,
      },
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      expiresInSeconds: 600,
      usedRecovery,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  response.cookies.set(
    stepUpCookieName(),
    createStepUpToken(userId),
    stepUpCookieOptions(),
  );

  return response;
}
