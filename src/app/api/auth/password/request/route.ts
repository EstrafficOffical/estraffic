import crypto from "crypto";
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

function trustedBaseUrl() {
  const configured =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return configured.replace(/\/+$/, "");
}

function requestLocale(req: Request) {
  const referer = req.headers.get("referer");

  if (referer) {
    try {
      const parsed = new URL(referer);
      const locale =
        parsed.pathname
          .split("/")[1]
          ?.toLowerCase();

      if (
        locale === "en" ||
        locale === "ru"
      ) {
        return locale;
      }
    } catch {
      // Referer never controls the reset host.
    }
  }

  return "ru";
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

    const email = String(
      body?.email || "",
    )
      .trim()
      .toLowerCase();

    const generic = {
      ok: true,
      message:
        "If the account exists, password reset instructions were created.",
    };

    const ipLimit = await checkRateLimit({
      scope: "password-request-ip",
      identifier: clientIp(req),
      limit: 5,
      windowSeconds: 15 * 60,
    });

    if (!ipLimit.allowed) {
      return noStore(
        {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
          message:
            "Too many reset requests. Please try again later.",
        },
        429,
        rateLimitHeaders(ipLimit),
      );
    }

    if (!email) {
      return noStore(
        {
          ok: false,
          error: "Email is required",
        },
        400,
      );
    }

    // Applied whether or not the account exists, so this does not create
    // an account-enumeration side channel.
    const emailLimit = await checkRateLimit({
      scope: "password-request-email",
      identifier: email,
      limit: 3,
      windowSeconds: 60 * 60,
    });

    if (!emailLimit.allowed) {
      return noStore(
        {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
          message:
            "Too many reset requests. Please try again later.",
        },
        429,
        rateLimitHeaders(emailLimit),
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return noStore(generic);
    }

    const rawToken = crypto
      .randomBytes(32)
      .toString("hex");
    const tokenHash = sha256(rawToken);
    const expires = new Date(
      Date.now() + 30 * 60 * 1000,
    );

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { identifier: email },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: email,
          token: tokenHash,
          expires,
        },
      }),
    ]);

    const locale = requestLocale(req);
    const resetUrl =
      `${trustedBaseUrl()}/${locale}/auth/reset?token=` +
      encodeURIComponent(rawToken);

    if (process.env.NODE_ENV === "production") {
      // Production email delivery is wired in a later launch step.
      // Never expose the bearer token in the production response.
      return noStore(generic);
    }

    return noStore({
      ...generic,
      devResetUrl: resetUrl,
    });
  } catch (error: any) {
    console.error(
      "[AUTH] password reset request failed",
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
