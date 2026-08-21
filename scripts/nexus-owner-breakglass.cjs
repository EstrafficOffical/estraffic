const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const { authenticator } = require("otplib");
const { PrismaClient } = require("@prisma/client");

authenticator.options = {
  step: 30,
  window: 1,
};

const prisma = new PrismaClient();
const root = process.cwd();
const nexusRoot = path.dirname(root);

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const out = {};

  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const i = line.indexOf("=");
    if (i < 1) continue;

    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
}

const env = {
  ...readEnvFile(path.join(root, ".env")),
  ...readEnvFile(path.join(root, ".env.local")),
  ...process.env,
};

process.env.DATABASE_URL = env.DATABASE_URL;

function masterKey() {
  const value = env.NEXUS_2FA_ENCRYPTION_KEY;

  if (!value || value.length < 32) {
    throw new Error("NEXUS_2FA_ENCRYPTION_KEY is missing or too short.");
  }

  const digestHex = crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");

  return crypto.createSecretKey(digestHex, "hex");
}

function recoveryPepper() {
  const pepperHex = crypto
    .createHmac("sha256", masterKey())
    .update("nexus-2fa-recovery-v1")
    .digest("hex");

  return crypto.createSecretKey(pepperHex, "hex");
}

function encryptTwoFactorSecret(secret) {
  const ivHex = crypto.randomBytes(12).toString("hex");

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivHex, "hex"),
  );

  const encryptedHex =
    cipher.update(secret, "utf8", "hex") +
    cipher.final("hex");

  const tagHex = cipher.getAuthTag().toString("hex");

  return ["v1", ivHex, tagHex, encryptedHex].join(".");
}

function decryptTwoFactorSecret(payload) {
  const [version, ivHex, tagHex, encryptedHex] = String(payload || "").split(".");

  if (version !== "v1" || !ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted 2FA secret.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    masterKey(),
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return (
    decipher.update(encryptedHex, "hex", "utf8") +
    decipher.final("utf8")
  );
}

function normalizeRecoveryCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function hashRecoveryCode(code) {
  return crypto
    .createHmac("sha256", recoveryPepper())
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}

function generateRecoveryCodes(count = 10) {
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

function sha256(value) {
  return crypto
    .createHash("sha256")
    .update(String(value || ""), "utf8")
    .digest("hex");
}

function timingSafeHexEqual(a, b) {
  if (
    !/^[a-f0-9]{64}$/i.test(String(a || "")) ||
    !/^[a-f0-9]{64}$/i.test(String(b || ""))
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(a, "hex"),
    Buffer.from(b, "hex"),
  );
}

async function verifyBreakGlassIdentity() {
  const email = String(env.NEXUS_RECOVERY_INPUT_EMAIL || "")
    .trim()
    .toLowerCase();

  const password = String(env.NEXUS_RECOVERY_INPUT_PASSWORD || "");
  const secret = String(env.NEXUS_RECOVERY_INPUT_SECRET || "");
  const expectedHash = String(env.NEXUS_OWNER_RECOVERY_HASH || "").trim();

  if (!email || !password || !secret) {
    throw new Error("Missing break-glass input.");
  }

  if (!timingSafeHexEqual(sha256(secret), expectedHash)) {
    throw new Error("Break-glass secret is invalid.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      twoFactor: true,
    },
  });

  if (!user) {
    throw new Error("OWNER account not found.");
  }

  if (user.role !== "OWNER") {
    throw new Error("Break-glass recovery is restricted to OWNER accounts.");
  }

  if (user.status !== "APPROVED") {
    throw new Error(`OWNER account status is ${user.status}, not APPROVED.`);
  }

  if (!user.passwordHash) {
    throw new Error("OWNER account does not have a local password.");
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);

  if (!passwordOk) {
    throw new Error("OWNER password is invalid.");
  }

  return user;
}

async function begin() {
  const user = await verifyBreakGlassIdentity();

  const newSecret = authenticator.generateSecret();
  const pendingSecretEnc = encryptTwoFactorSecret(newSecret);
  const setupExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.nexusTwoFactor.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        enabled: false,
        pendingSecretEnc,
        setupExpiresAt,
      },
      update: {
        // Keep the CURRENT factor active until the replacement is confirmed.
        pendingSecretEnc,
        setupExpiresAt,
      },
    });

    await tx.nexusSecurityEvent.create({
      data: {
        eventType: "OWNER_BREAK_GLASS_STARTED",
        userId: user.id,
        metadata: {
          source: "server_cli",
          setupExpiresAt: setupExpiresAt.toISOString(),
        },
      },
    });
  });

  const otpAuthUri = authenticator.keyuri(
    user.email,
    "NEXUS ALLIANCE",
    newSecret,
  );

  const qrPath = path.join(nexusRoot, "OWNER-2FA-RECOVERY-QR.png");
  await QRCode.toFile(qrPath, otpAuthUri, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "M",
  });

  console.log("");
  console.log("OWNER break-glass identity verified.");
  console.log("A replacement TOTP factor is pending for 10 minutes.");
  console.log(`QR file: ${qrPath}`);
  console.log("");
  console.log(
    "The existing 2FA factor remains active until the replacement code is confirmed.",
  );
}

async function confirm() {
  const user = await verifyBreakGlassIdentity();
  const code = String(env.NEXUS_RECOVERY_TOTP_CODE || "").trim();

  if (!/^\d{6}$/.test(code)) {
    throw new Error("Enter a valid 6-digit authenticator code.");
  }

  const factor = await prisma.nexusTwoFactor.findUnique({
    where: { userId: user.id },
  });

  if (
    !factor?.pendingSecretEnc ||
    !factor.setupExpiresAt ||
    factor.setupExpiresAt <= new Date()
  ) {
    throw new Error("Pending break-glass setup is missing or expired.");
  }

  const secret = decryptTwoFactorSecret(factor.pendingSecretEnc);

  if (!authenticator.check(code, secret)) {
    throw new Error("Authenticator code is invalid.");
  }

  const recoveryCodes = generateRecoveryCodes(10);
  const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.nexusTwoFactor.update({
      where: { userId: user.id },
      data: {
        enabled: true,
        secretEnc: factor.pendingSecretEnc,
        pendingSecretEnc: null,
        setupExpiresAt: null,
        recoveryHashes,
        confirmedAt: now,
        lastUsedAt: now,
      },
    });

    // Kill every outstanding pre-auth login challenge.
    await tx.nexusLoginChallenge.deleteMany({
      where: { userId: user.id },
    });

    await tx.nexusSecurityEvent.create({
      data: {
        eventType: "OWNER_BREAK_GLASS_COMPLETED",
        userId: user.id,
        metadata: {
          source: "server_cli",
          recoveryCodesIssued: recoveryCodes.length,
        },
      },
    });
  });

  const codesPath = path.join(
    nexusRoot,
    "OWNER-2FA-RECOVERY-CODES-ONCE.txt",
  );

  fs.writeFileSync(
    codesPath,
    [
      "NEXUS ALLIANCE OWNER RECOVERY CODES",
      "Generated by emergency break-glass re-enrollment.",
      "Store these in a password manager, then delete this file.",
      "",
      ...recoveryCodes,
      "",
    ].join("\r\n"),
    "utf8",
  );

  const qrPath = path.join(nexusRoot, "OWNER-2FA-RECOVERY-QR.png");

  try {
    fs.unlinkSync(qrPath);
  } catch {}

  console.log("");
  console.log("OWNER 2FA break-glass re-enrollment completed.");
  console.log("The OLD authenticator factor and OLD recovery codes are no longer valid.");
  console.log(`New recovery codes file: ${codesPath}`);
  console.log("");
  console.log("Save the new recovery codes securely and delete the file afterward.");
}

async function audit() {
  const ownerCount = await prisma.user.count({
    where: {
      role: "OWNER",
      status: "APPROVED",
    },
  });

  const eventCount = await prisma.nexusSecurityEvent.count();

  console.log("");
  console.table([
    {
      approvedOwners: ownerCount,
      securityEvents: eventCount,
      recoveryHashConfigured: /^[a-f0-9]{64}$/i.test(
        String(env.NEXUS_OWNER_RECOVERY_HASH || ""),
      ),
      encryptionKeyConfigured:
        String(env.NEXUS_2FA_ENCRYPTION_KEY || "").length >= 32,
    },
  ]);

  if (ownerCount < 1) {
    throw new Error("No APPROVED OWNER account exists.");
  }

  if (
    !/^[a-f0-9]{64}$/i.test(
      String(env.NEXUS_OWNER_RECOVERY_HASH || ""),
    )
  ) {
    throw new Error("NEXUS_OWNER_RECOVERY_HASH is missing or invalid.");
  }

  if (String(env.NEXUS_2FA_ENCRYPTION_KEY || "").length < 32) {
    throw new Error("NEXUS_2FA_ENCRYPTION_KEY is missing or invalid.");
  }

  console.log("OWNER BREAK-GLASS AUDIT PASSED.");
}

(async () => {
  const mode = String(process.argv[2] || "audit").toLowerCase();

  if (mode === "begin") {
    await begin();
  } else if (mode === "confirm") {
    await confirm();
  } else if (mode === "audit") {
    await audit();
  } else {
    throw new Error(`Unknown mode: ${mode}`);
  }
})()
  .catch((error) => {
    console.error("");
    console.error("OWNER BREAK-GLASS ERROR:");
    console.error(error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
