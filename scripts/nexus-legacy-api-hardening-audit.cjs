const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relative) {
  const full = path.join(root, relative);

  if (!fs.existsSync(full)) {
    throw new Error(`Missing: ${relative}`);
  }

  return fs.readFileSync(full, "utf8");
}

const disabled = [
  "src/app/api/offers/top/route.ts",
  "src/app/api/payouts/list/route.ts",
  "src/app/api/payouts/recent/route.ts",
  "src/app/api/wallet/list/route.ts",
  "src/app/api/news/list/route.ts",
  "src/app/api/postback/route.ts",
  "src/app/api/postbacks/favbet/route.ts",
  "src/app/api/postbacks/vegas/route.ts",
];

const disabledChecks = Object.fromEntries(
  disabled.map((relative) => [
    `disabled:${relative}`,
    read(relative).includes(
      "LEGACY_ENDPOINT_DISABLED",
    ),
  ]),
);

const offersCreate = read(
  "src/app/api/offers/create/route.ts",
);
const ingest = read(
  "src/app/api/postbacks/ingest/route.ts",
);
const universal = read(
  "src/app/api/postbacks/universal/route.ts",
);
const canonical = read(
  "src/app/api/nexus/postback/route.ts",
);

const checks = {
  offersCreateRequiresAdmin:
    offersCreate.includes("requireAdmin") &&
    offersCreate.includes("await requireAdmin()"),
  ingestDelegatesCanonical:
    ingest.includes("/api/nexus/postback") &&
    ingest.includes("NextResponse.redirect") &&
    ingest.includes("307"),
  universalDelegatesCanonical:
    universal.includes("/api/nexus/postback") &&
    universal.includes("NextResponse.redirect") &&
    universal.includes("307"),
  canonicalRequiresSecret:
    canonical.includes("NEXUS_POSTBACK_SECRET") &&
    canonical.includes("POSTBACK_SHARED_SECRET") &&
    canonical.includes("UNAUTHORIZED"),
  ...disabledChecks,
};

const postbacksClientPath = path.join(
  root,
  "src/app/[locale]/(auth)/postbacks/PostbacksClient.tsx",
);

if (fs.existsSync(postbacksClientPath)) {
  const ui = fs.readFileSync(
    postbacksClientPath,
    "utf8",
  );

  checks.postbacksUiMentionsCanonical =
    ui.includes("/api/nexus/postback");
}

console.table(checks);

const failed = Object.entries(checks)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (failed.length) {
  console.error(
    "\nLEGACY API HARDENING AUDIT FAILED:",
  );

  for (const name of failed) {
    console.error(" -", name);
  }

  process.exit(1);
}

console.log(
  "\nLEGACY API HARDENING AUDIT PASSED.",
);
