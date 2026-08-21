import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
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
      const locale = parsed.pathname.split("/")[1]?.toLowerCase();
      if (locale === "en" || locale === "ru") return locale;
    } catch {
      // Ignore malformed/untrusted Referer. It is never used as the host.
    }
  }

  return "ru";
}

function noStore(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return noStore({ ok: false, error: "Email is required" }, 400);
    }

    // Generic success prevents account enumeration.
    const generic = {
      ok: true,
      message: "If the account exists, password reset instructions were created.",
    };

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

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(rawToken);
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { identifier: email },
      }),
      prisma.verificationToken.create({
        data: {
          identifier: email,
          // Only the SHA-256 digest is stored in the database.
          token: tokenHash,
          expires,
        },
      }),
    ]);

    const locale = requestLocale(req);
    const resetUrl =
      `${trustedBaseUrl()}/${locale}/auth/reset?token=` +
      encodeURIComponent(rawToken);

    // Production must deliver resetUrl through a trusted email provider.
    // Never expose the bearer reset token in the production HTTP response.
    if (process.env.NODE_ENV === "production") {
      // STEP 8F.2 will connect actual email delivery.
      return noStore(generic);
    }

    return noStore({
      ...generic,
      devResetUrl: resetUrl,
    });
  } catch (error: any) {
    console.error("[AUTH] password reset request failed", error);

    return noStore(
      {
        ok: false,
        error: "Server error",
      },
      500,
    );
  }
}
