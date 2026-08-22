const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = process.cwd();

function read(relative) {
  const full = path.join(root, relative);

  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${relative}`);
  }

  return fs.readFileSync(full, "utf8");
}

const schema = read("prisma/schema.prisma");
const helper = read("src/lib/nexus-rate-limit.ts");
const auth = read("src/lib/auth.ts");
const preauth = read(
  "src/app/api/auth/2fa/preauth/route.ts",
);
const request = read(
  "src/app/api/auth/password/request/route.ts",
);
const reset = read(
  "src/app/api/auth/password/reset/route.ts",
);
const signup = read(
  "src/app/api/auth/signup/route.ts",
);
const stepup = read(
  "src/app/api/security/step-up/route.ts",
);

const checks = {
  prismaRateLimitModel:
    schema.includes("model NexusRateLimit"),
  noRawIdentifierField:
    !/model NexusRateLimit[\s\S]*identifier\s+String/.test(
      schema,
    ),
  helperUsesHmac:
    helper.includes('createHmac("sha256"'),
  helperAtomicSql:
    helper.includes('ON CONFLICT ("key")') &&
    helper.includes(
      '"NexusRateLimit"."count" + 1',
    ),
  helperHasIpExtraction:
    helper.includes("x-forwarded-for"),
  directCredentialsLimited:
    auth.includes("auth-credentials-ip") &&
    auth.includes("auth-credentials-email"),
  preauthLimited:
    preauth.includes("auth-preauth-ip") &&
    preauth.includes("auth-preauth-email"),
  passwordRequestLimited:
    request.includes("password-request-ip") &&
    request.includes(
      "password-request-email",
    ),
  passwordResetLimited:
    reset.includes("password-reset-ip") &&
    reset.includes(
      "password-reset-token",
    ),
  signupLimited:
    signup.includes("signup-ip") &&
    signup.includes("signup-email"),
  stepUpLimited:
    stepup.includes("step-up-ip") &&
    stepup.includes("step-up-user"),
  retryAfterHeaders:
    helper.includes("Retry-After"),
};

console.table(checks);

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failed.length) {
  console.error("\nRATE LIMIT SOURCE AUDIT FAILED:");
  failed.forEach((name) =>
    console.error(" -", name),
  );
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  const count =
    await prisma.nexusRateLimit.count();

  console.log(
    `\nNexusRateLimit table reachable. Current rows: ${count}`,
  );
  console.log(
    "RATE LIMIT FOUNDATION AUDIT PASSED.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
