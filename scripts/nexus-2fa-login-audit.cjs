const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = process.cwd();

const paths = {
  auth: "src/lib/auth.ts",
  twofa: "src/lib/nexus-2fa.ts",
  preauth: "src/app/api/auth/2fa/preauth/route.ts",
  login: "src/app/[locale]/login/page.tsx",
  middleware: "src/middleware.ts",
  disable: "src/app/api/profile/2fa/disable/route.ts",
};

const text = {};

for (const [name, relative] of Object.entries(paths)) {
  const full = path.join(root, relative);

  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${name}: ${relative}`);
  }

  text[name] = fs.readFileSync(full, "utf8");
}

const schema = fs.readFileSync(
  path.join(root, "prisma", "schema.prisma"),
  "utf8",
);

const checks = {
  challengeModel: schema.includes("model NexusLoginChallenge"),
  challengeRelation: schema.includes(
    "loginChallenges   NexusLoginChallenge[]",
  ),
  preauthCreatesChallenge:
    text.preauth.includes("nexusLoginChallenge.create"),
  challengeExpiresFiveMinutes:
    text.preauth.includes("5 * 60 * 1000"),
  directCredentialsCannotBypass:
    text.auth.includes("factorEnabled ||") &&
    text.auth.includes("isTwoFactorRequiredForRole"),
  challengeConsumedAtomically:
    text.auth.includes("claimed.count !== 1"),
  recoveryCodeConsumed:
    text.auth.includes("recoveryHashes: remaining"),
  sessionHasVerifiedClaim:
    text.auth.includes("twoFactorVerified"),
  serverAuthEnforces2fa:
    text.auth.includes("requiresTwoFactor") &&
    text.auth.includes("return null"),
  middlewareEnforces2fa:
    text.middleware.includes("TwoFactorRequired") &&
    text.middleware.includes("token.twoFactorVerified !== true"),
  requiredRolesCannotDisable:
    text.disable.includes("REQUIRED_BY_ROLE"),
  loginHasSecondStage:
    text.login.includes("Verify and sign in") &&
    text.login.includes("challengeToken"),
  googleCannotBypass:
    text.auth.includes(
      "(user as any).twoFactorVerified !== true",
    ),
};

console.table(checks);

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failed.length) {
  console.error("\n2FA LOGIN AUDIT FAILED:");

  for (const name of failed) {
    console.error(" -", name);
  }

  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  const staff = await prisma.user.findMany({
    where: {
      status: "APPROVED",
      role: {
        in: ["OWNER", "ADMIN"],
      },
    },
    select: {
      email: true,
      role: true,
      twoFactor: {
        select: {
          enabled: true,
        },
      },
    },
  });

  const missing = staff.filter(
    (user) => !user.twoFactor?.enabled,
  );

  if (missing.length) {
    throw new Error(
      `Approved OWNER/ADMIN without enabled 2FA: ${missing
        .map((user) => `${user.role}:${user.email}`)
        .join(", ")}`,
    );
  }

  console.log("\n2FA LOGIN ENFORCEMENT AUDIT PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
