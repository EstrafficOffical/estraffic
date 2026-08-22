const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relative) {
  const full = path.join(root, relative);

  if (!fs.existsSync(full)) {
    throw new Error(`Missing file: ${relative}`);
  }

  return fs.readFileSync(full, "utf8");
}

const files = {
  helper: read("src/lib/nexus-step-up.ts"),
  api: read("src/app/api/security/step-up/route.ts"),
  page: read(
    "src/app/[locale]/(auth)/security/step-up/page.tsx",
  ),
  payout: read(
    "src/app/[locale]/(auth)/admin/payouts/page.tsx",
  ),
  team: read("src/app/api/admin/team/[id]/route.ts"),
  makeAdmin: read(
    "src/app/api/admin/users/[id]/make-admin/route.ts",
  ),
  makeUser: read(
    "src/app/api/admin/users/[id]/make-user/route.ts",
  ),
  secret: read("src/app/api/postbacks/secret/route.ts"),
};

const payoutGuardCount = (
  files.payout.match(
    /hasRecentStepUp\(securityUserId\)/g,
  ) || []
).length;

const checks = {
  signedStepUpCookie:
    files.helper.includes("createHmac") &&
    files.helper.includes("__Host-nexus-step-up"),
  tenMinuteTtl:
    files.helper.includes("10 * 60"),
  stepUpApiRequiresAuthenticated2fa:
    files.api.includes("await auth()") &&
    files.api.includes("twoFactor?.enabled"),
  stepUpSupportsRecovery:
    files.api.includes("recoveryHashMatches") &&
    files.api.includes("recoveryHashes: remaining"),
  stepUpSecurityEvents:
    files.api.includes("STEP_UP_GRANTED") &&
    files.api.includes("STEP_UP_DENIED"),
  stepUpPage:
    files.page.includes("Verify and continue") &&
    files.page.includes("/api/security/step-up"),
  payoutMutationsProtected:
    payoutGuardCount >= 3,
  teamProtected:
    files.team.includes("hasRecentStepUp(meId)") &&
    files.team.includes("STEP_UP_REQUIRED"),
  adminGrantRequiresTarget2fa:
    files.team.includes("TARGET_2FA_REQUIRED") &&
    files.makeAdmin.includes("TARGET_2FA_REQUIRED"),
  legacyMakeAdminOwnerOnly:
    files.makeAdmin.includes('role !== "OWNER"'),
  legacyMakeUserOwnerOnly:
    files.makeUser.includes('role !== "OWNER"'),
  secretRevealProtected:
    files.secret.includes("hasRecentStepUp(userId)") &&
    files.secret.includes("POSTBACK_SECRET_REVEALED"),
};

console.table({
  ...checks,
  payoutGuardCount,
});

const failed = Object.entries(checks)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (failed.length) {
  console.error("\nSTEP-UP AUDIT FAILED:");

  for (const name of failed) {
    console.error(" -", name);
  }

  process.exit(1);
}

console.log("\nSTEP-UP SECURITY AUDIT PASSED.");
