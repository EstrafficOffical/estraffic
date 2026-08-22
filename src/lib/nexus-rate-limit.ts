import crypto from "crypto";
import { prisma } from "@/lib/prisma";

type HeaderSource =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined
  | null;

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  count: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
};

function pepper() {
  const value =
    process.env.NEXUS_RATE_LIMIT_PEPPER ||
    process.env.NEXUS_2FA_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error(
      "NEXUS_RATE_LIMIT_PEPPER (or a secure fallback secret) is required",
    );
  }

  return value;
}

function normalizedIdentifier(value: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized || "unknown";
}

function bucketKey(scope: string, identifier: string) {
  return crypto
    .createHmac("sha256", pepper())
    .update(
      `${scope}\u0000${normalizedIdentifier(identifier)}`,
      "utf8",
    )
    .digest("hex");
}

function headerValue(
  headers: HeaderSource,
  name: string,
) {
  if (!headers) return null;

  if (
    typeof Headers !== "undefined" &&
    headers instanceof Headers
  ) {
    return headers.get(name);
  }

  const record = headers as Record<
    string,
    string | string[] | undefined
  >;

  const raw =
    record[name] ??
    record[name.toLowerCase()] ??
    record[name.toUpperCase()];

  if (Array.isArray(raw)) {
    return raw[0] || null;
  }

  return raw == null ? null : String(raw);
}

export function clientIpFromHeaders(
  headers: HeaderSource,
) {
  const forwarded = headerValue(
    headers,
    "x-forwarded-for",
  );

  if (forwarded) {
    const first = forwarded
      .split(",")[0]
      ?.trim();

    if (first) return first;
  }

  return (
    headerValue(headers, "cf-connecting-ip") ||
    headerValue(headers, "x-real-ip") ||
    "unknown"
  );
}

export function clientIp(req: Request) {
  return clientIpFromHeaders(req.headers);
}

export function rateLimitHeaders(
  result: RateLimitResult,
) {
  return {
    "Cache-Control": "no-store",
    "Retry-After": String(
      result.retryAfterSeconds,
    ),
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(
      result.remaining,
    ),
    "X-RateLimit-Reset": String(
      Math.floor(
        result.resetAt.getTime() / 1000,
      ),
    ),
  };
}

export async function checkRateLimit({
  scope,
  identifier,
  limit,
  windowSeconds,
}: {
  scope: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  if (
    !scope ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    !Number.isInteger(windowSeconds) ||
    windowSeconds < 1
  ) {
    throw new Error("Invalid rate-limit rule");
  }

  const key = bucketKey(scope, identifier);
  const candidateResetAt = new Date(
    Date.now() + windowSeconds * 1000,
  );

  const rows = await prisma.$queryRaw<
    Array<{
      count: number;
      resetAt: Date;
    }>
  >`
    INSERT INTO "NexusRateLimit"
      ("key", "scope", "count", "resetAt", "createdAt", "updatedAt")
    VALUES
      (${key}, ${scope}, 1, ${candidateResetAt}, NOW(), NOW())
    ON CONFLICT ("key")
    DO UPDATE SET
      "count" = CASE
        WHEN "NexusRateLimit"."resetAt" <= NOW()
          THEN 1
        ELSE "NexusRateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "NexusRateLimit"."resetAt" <= NOW()
          THEN EXCLUDED."resetAt"
        ELSE "NexusRateLimit"."resetAt"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "resetAt";
  `;

  const row = rows[0];

  if (!row) {
    throw new Error(
      "Rate-limit bucket update failed",
    );
  }

  const resetAt =
    row.resetAt instanceof Date
      ? row.resetAt
      : new Date(row.resetAt);

  const count = Number(row.count);
  const allowed = count <= limit;
  const remaining = Math.max(
    0,
    limit - count,
  );

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      (resetAt.getTime() - Date.now()) /
        1000,
    ),
  );

  // Cheap probabilistic cleanup. No raw IP/email is stored, only HMAC keys.
  if (Math.random() < 0.01) {
    void prisma.nexusRateLimit
      .deleteMany({
        where: {
          resetAt: {
            lt: new Date(
              Date.now() -
                7 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      })
      .catch(() => undefined);
  }

  return {
    allowed,
    limit,
    count,
    remaining,
    resetAt,
    retryAfterSeconds,
  };
}
