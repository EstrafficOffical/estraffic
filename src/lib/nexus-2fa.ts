import crypto from "crypto";
import { authenticator } from "otplib";

const ISSUER = "NEXUS ALLIANCE";

authenticator.options = {
  step: 30,
  window: 1,
};

function masterKey(): crypto.KeyObject {
  const value = process.env.NEXUS_2FA_ENCRYPTION_KEY;

  if (!value || value.length < 32) {
    throw new Error("NEXUS_2FA_ENCRYPTION_KEY is missing or too short");
  }

  const digestHex = crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");

  // createSecretKey accepts a string + encoding and avoids the Buffer generic
  // mismatch caused by newer @types/node definitions.
  return crypto.createSecretKey(digestHex, "hex");
}

function recoveryPepper(): crypto.KeyObject {
  const pepperHex = crypto
    .createHmac("sha256", masterKey())
    .update("nexus-2fa-recovery-v1")
    .digest("hex");

  return crypto.createSecretKey(pepperHex, "hex");
}

export function encryptTwoFactorSecret(secret: string) {
  const ivHex = crypto.randomBytes(12).toString("hex");

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivHex, "hex") as any,
  );

  // Keep ciphertext as a string. This deliberately avoids Buffer.concat(),
  // which is where the current Node typings fail in this project.
  const encryptedHex =
    cipher.update(secret, "utf8", "hex") +
    cipher.final("hex");

  const tagHex = cipher.getAuthTag().toString("hex");

  return ["v1", ivHex, tagHex, encryptedHex].join(".");
}

export function decryptTwoFactorSecret(payload: string) {
  const [version, ivHex, tagHex, encryptedHex] = payload.split(".");

  if (
    version !== "v1" ||
    !ivHex ||
    !tagHex ||
    !encryptedHex
  ) {
    throw new Error("Invalid encrypted 2FA secret");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivHex, "hex") as any,
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex") as any);

  return (
    decipher.update(encryptedHex, "hex", "utf8") +
    decipher.final("utf8")
  );
}

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function buildTotpUri(email: string, secret: string) {
  return authenticator.keyuri(email, ISSUER, secret);
}

export function verifyTotpCode(secret: string, code: string) {
  const normalized = String(code || "").replace(/\s+/g, "");

  if (!/^\d{6}$/.test(normalized)) {
    return false;
  }

  return authenticator.check(normalized, secret);
}

export function normalizeRecoveryCode(code: string) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(code: string) {
  return crypto
    .createHmac("sha256", recoveryPepper())
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}

export function recoveryHashMatches(hash: string, code: string) {
  const expectedHex = hashRecoveryCode(code);

  if (
    !/^[a-f0-9]{64}$/i.test(hash) ||
    !/^[a-f0-9]{64}$/i.test(expectedHex)
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(hash, "hex") as any,
    Buffer.from(expectedHex, "hex") as any,
  );
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(10).toString("hex").toUpperCase();

    return [
      raw.slice(0, 5),
      raw.slice(5, 10),
      raw.slice(10, 15),
      raw.slice(15, 20),
    ].join("-");
  });
}

export function isTwoFactorRequiredForRole(role: string) {
  return role === "OWNER" || role === "ADMIN";
}
