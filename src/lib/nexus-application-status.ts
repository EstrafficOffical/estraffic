import crypto from "crypto";

const STATUS_TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60;

type ApplicationStatusTokenPayload = {
  v: 1;
  applicationId: string;
  userId: string;
  exp: number;
};

function signingKey() {
  const secret =
    process.env.NEXUS_APPLICATION_STATUS_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret || secret.length < 16) {
    throw new Error(
      "NEXUS application status signing secret is not configured",
    );
  }

  return crypto
    .createHash("sha256")
    .update(`nexus-application-status:v1:${secret}`, "utf8")
    .digest("base64url");
}

function sign(payloadPart: string) {
  return crypto
    .createHmac("sha256", signingKey())
    .update(payloadPart, "utf8")
    .digest("base64url");
}

export function createApplicationStatusToken(input: {
  applicationId: string;
  userId: string;
}) {
  const payload: ApplicationStatusTokenPayload = {
    v: 1,
    applicationId: input.applicationId,
    userId: input.userId,
    exp:
      Math.floor(Date.now() / 1000) +
      STATUS_TOKEN_TTL_SECONDS,
  };

  const payloadPart = Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");

  return `${payloadPart}.${sign(payloadPart)}`;
}

export function verifyApplicationStatusToken(
  token: string,
): ApplicationStatusTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadPart, signaturePart] = parts;
    if (!payloadPart || !signaturePart) return null;

    const encoder = new TextEncoder();
    const expected = encoder.encode(sign(payloadPart));
    const actual = encoder.encode(signaturePart);

    if (
      expected.length !== actual.length ||
      !crypto.timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const parsed = JSON.parse(
      Buffer.from(payloadPart, "base64url").toString("utf8"),
    ) as Partial<ApplicationStatusTokenPayload>;

    if (
      parsed.v !== 1 ||
      typeof parsed.applicationId !== "string" ||
      !parsed.applicationId ||
      typeof parsed.userId !== "string" ||
      !parsed.userId ||
      typeof parsed.exp !== "number" ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      v: 1,
      applicationId: parsed.applicationId,
      userId: parsed.userId,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}