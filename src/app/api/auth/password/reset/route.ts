import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
} from "@/lib/nexus-rate-limit";

export const dynamic = "force-dynamic";

function sha256(value: string) {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");
}

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
    const body = await req
      .json()
      .catch(() => ({}));

    const token = String(
      body?.token || "",
    ).trim();
    const password = String(
      body?.password || "",
    );

    const ipLimit = await checkRateLimit({
      scope: "password-reset-ip",
      identifier: clientIp(req),
      limit: 10,
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

    if (!token || !password) {
      return noStore(
        {
          ok: false,
          error:
            "Token and password are required",
        },
        400,
      );
    }

    const tokenLimit = await checkRateLimit({
      scope: "password-reset-token",
      identifier: token,
      limit: 6,
      windowSeconds: 15 * 60,
    });

    if (!tokenLimit.allowed) {
      return noStore(
        {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
        },
        429,
        rateLimitHeaders(tokenLimit),
      );
    }

    if (
      password.length < 8 ||
      password.length > 128
    ) {
      return noStore(
        {
          ok: false,
          error:
            "Password must be between 8 and 128 characters.",
        },
        400,
      );
    }

    const tokenHash = sha256(token);

    const row =
      await prisma.verificationToken.findUnique({
        where: {
          token: tokenHash,
        },
      });

    if (
      !row ||
      row.expires < new Date()
    ) {
      if (row) {
        await prisma.verificationToken
          .delete({
            where: {
              token: tokenHash,
            },
          })
          .catch(() => undefined);
      }

      return noStore(
        {
          ok: false,
          error:
            "Invalid or expired token",
        },
        400,
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: row.identifier,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      await prisma.verificationToken
        .delete({
          where: {
            token: tokenHash,
          },
        })
        .catch(() => undefined);

      return noStore(
        {
          ok: false,
          error:
            "Invalid or expired token",
        },
        400,
      );
    }

    const configuredRounds =
      Number.parseInt(
        String(
          process.env.BCRYPT_SALT_ROUNDS ??
            "12",
        ),
        10,
      );

    const rounds =
      Number.isFinite(configuredRounds)
        ? Math.min(
            Math.max(
              configuredRounds,
              10,
            ),
            15,
          )
        : 12;

    const passwordHash =
      await bcrypt.hash(
        password,
        rounds,
      );

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash,
          authVersion: { increment: 1 },
        },
      }),
      prisma.nexusLoginChallenge.deleteMany({
        where: { userId: user.id },
      }),
      prisma.verificationToken.deleteMany({
        where: {
          identifier: user.email,
        },
      }),
    ]);

    return noStore({
      ok: true,
    });
  } catch (error: any) {
    console.error(
      "[AUTH] password reset failed",
      error,
    );

    return noStore(
      {
        ok: false,
        error: "Server error",
      },
      500,
    );
  }
}
