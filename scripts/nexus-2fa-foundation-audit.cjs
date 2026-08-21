const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const root = process.cwd();

const expectedFiles = [
  "src/lib/nexus-2fa.ts",
  "src/app/api/profile/2fa/status/route.ts",
  "src/app/api/profile/2fa/setup/route.ts",
  "src/app/api/profile/2fa/confirm/route.ts",
  "src/app/api/profile/2fa/disable/route.ts",
  "src/app/[locale]/(auth)/profile/page.tsx",
];

const checks = {};

for (const relative of expectedFiles) {
  checks[`file:${relative}`] = fs.existsSync(path.join(root, relative));
}

const schema = fs.readFileSync(
  path.join(root, "prisma", "schema.prisma"),
  "utf8",
);

checks.prismaTwoFactorModel = schema.includes("model NexusTwoFactor");
checks.userTwoFactorRelation = schema.includes(
  "twoFactor         NexusTwoFactor?",
);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

checks.otplibInstalled = Boolean(packageJson.dependencies?.otplib);
checks.qrcodeInstalled = Boolean(packageJson.dependencies?.qrcode);

const envText = [".env", ".env.local"]
  .filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

checks.localEncryptionKeyPresent =
  /(?:^|\n)NEXUS_2FA_ENCRYPTION_KEY=.+/m.test(envText);

console.table(checks);

const failedStatic = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failedStatic.length) {
  console.error("\n2FA FOUNDATION AUDIT FAILED:");
  for (const name of failedStatic) console.error(" -", name);
  process.exit(1);
}

const prisma = new PrismaClient();

(async () => {
  const count = await prisma.nexusTwoFactor.count();

  console.log(`\nNexusTwoFactor table reachable. Current rows: ${count}`);
  console.log("2FA FOUNDATION AUDIT PASSED.");
})()
  .catch((error) => {
    console.error("\n2FA DB AUDIT FAILED:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
