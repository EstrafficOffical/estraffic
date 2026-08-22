import crypto from "crypto";
import { cookies } from "next/headers";

const STEP_UP_TTL_SECONDS = 10 * 60;

type StepUpPayload = {
  v: 1;
  uid: string;
  iat: number;
  exp: number;
  nonce: string;
};

function signingKey() {
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const twoFactorKey = process.env.NEXUS_2FA_ENCRYPTION_KEY;

  if (!nextAuthSecret || !twoFactorKey) {
    throw new Error(
      "NEXTAUTH_SECRET and NEXUS_2FA_ENCRYPTION_KEY are required for step-up auth",
    );
  }

  return crypto
    .createHash("sha256")
    .update(
      `${nextAuthSecret}:${twoFactorKey}:nexus-step-up-v1`,
      "utf8",
    )
    .digest("hex");
}

function sign(encodedPayload: string) {
  return crypto
    .createHmac("sha256", signingKey())
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left as any, right as any)
  );
}

export function stepUpCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-nexus-step-up"
    : "nexus-step-up";
}

export function stepUpCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STEP_UP_TTL_SECONDS,
  };
}

export function createStepUpToken(userId: string) {
  const now = Math.floor(Date.now() / 1000);

  const payload: StepUpPayload = {
    v: 1,
    uid: userId,
    iat: now,
    exp: now + STEP_UP_TTL_SECONDS,
    nonce: crypto.randomBytes(16).toString("hex"),
  };

  const encoded = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

export function verifyStepUpToken(
  token: string,
  userId: string,
) {
  try {
    const [encoded, signature] = String(token || "").split(".");

    if (!encoded || !signature) return false;

    const expected = sign(encoded);

    if (!safeEqual(signature, expected)) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as StepUpPayload;

    const now = Math.floor(Date.now() / 1000);

    return Boolean(
      payload &&
        payload.v === 1 &&
        payload.uid === userId &&
        Number.isFinite(payload.iat) &&
        Number.isFinite(payload.exp) &&
        payload.iat <= now + 5 &&
        payload.exp > now &&
        payload.exp - payload.iat <= STEP_UP_TTL_SECONDS,
    );
  } catch {
    return false;
  }
}

export function hasRecentStepUp(userId: string) {
  if (!userId) return false;

  const token = cookies().get(stepUpCookieName())?.value;

  if (!token) return false;

  return verifyStepUpToken(token, userId);
}

export const NEXUS_STEP_UP_TTL_SECONDS =
  STEP_UP_TTL_SECONDS;
