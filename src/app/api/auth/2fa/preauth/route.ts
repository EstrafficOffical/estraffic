import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashLoginChallengeToken,
  isTwoFactorRequiredForRole,
} from "@/lib/nexus-2fa";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
} from "@/lib/nexus-rate-limit";
import { createApplicationStatusToken } from "@/lib/nexus-application-status";

export const dynamic = "force-dynamic";

function noStore(
  data: Record<string, unknown>,
  status = 200,
  extraHeaders?: Record<string, string>,
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const password = String(body?.password || "");

    const ipLimit = await checkRateLimit({
      scope: "auth-preauth-ip",
      identifier: clientIp(req),
      limit: 12,
      windowSeconds: 15 * 60,
    });

    if (!ipLimit.allowed) {
      return noStore(
        {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
        },
        429,
        rateLimitHeaders(ipLimit),
      );
    }

    if (!email || !password) {
      return noStore(
        {
          ok: false,
          error: "INVALID_CREDENTIALS",
        },
        401,
      );
    }

    const emailLimit = await checkRateLimit({
      scope: "auth-preauth-email",
      identifier: email,
      limit: 30,
      windowSeconds: 60 * 60,
    });

    if (!emailLimit.allowed) {
      return noStore(
        {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
        },
        429,
        rateLimitHeaders(emailLimit),
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        status: true,
        passwordHash: true,
        twoFactor: {
          select: {
            enabled: true,
            secretEnc: true,
          },
        },
      },
    });

    if (!user?.passwordHash) {
      return noStore(
        {
          ok: false,
          error: "INVALID_CREDENTIALS",
        },
        401,
      );
    }

    const passwordOk = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordOk) {
      return noStore(
        {
          ok: false,
          error: "INVALID_CREDENTIALS",
        },
        401,
      );
    }

    if (user.status === "PENDING") {
      const application =
        await prisma.affiliateApplication.findFirst({
          where: {
            userId: user.id,
            status: {
              in: ["PENDING", "REJECTED"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            userId: true,
          },
        });

      if (application) {
        const statusToken =
          createApplicationStatusToken({
            applicationId: application.id,
            userId: application.userId,
          });

        return noStore(
          {
            ok: false,
            error: "APPLICATION_STATUS",
            statusToken,
          },
          403,
        );
      }
    }

    if (user.status !== "APPROVED") {
      return noStore(
        {
          ok: false,
          error: "INVALID_CREDENTIALS",
        },
        401,
      );
    }

    const factorEnabled = Boolean(
      user.twoFactor?.enabled &&
      user.twoFactor.secretEnc,
    );

    const requiredByRole =
      isTwoFactorRequiredForRole(user.role);

    if (requiredByRole && !factorEnabled) {
      return noStore(
        {
          ok: false,
          error: "TWO_FACTOR_SETUP_REQUIRED",
        },
        403,
      );
    }

    if (!factorEnabled) {
      return noStore({
        ok: true,
        requiresTwoFactor: false,
      });
    }

    const rawToken = crypto
      .randomBytes(32)
      .toString("base64url");
    const tokenHash =
      hashLoginChallengeToken(rawToken);
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000,
    );

    await prisma.$transaction([
      prisma.nexusLoginChallenge.deleteMany({
        where: {
          userId: user.id,
        },
      }),
      prisma.nexusLoginChallenge.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
          attempts: 0,
        },
      }),
    ]);

    return noStore({
      ok: true,
      requiresTwoFactor: true,
      challengeToken: rawToken,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[AUTH] 2FA preauth failed", error);

    return noStore(
      {
        ok: false,
        error: "SERVER_ERROR",
      },
      500,
    );
  }
}
