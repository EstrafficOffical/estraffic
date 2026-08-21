const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

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
  ...readEnvFile(path.join(process.cwd(), ".env")),
  ...readEnvFile(path.join(process.cwd(), ".env.local")),
  ...process.env,
};

process.env.DATABASE_URL = env.DATABASE_URL;

const secret =
  env.NEXUS_FINANCE_SECRET ||
  env.CRON_SECRET ||
  env.NEXUS_POSTBACK_SECRET ||
  env.POSTBACK_SHARED_SECRET ||
  env.SERVER_SECRET;

const prisma = new PrismaClient();

(async () => {
  if (!secret) {
    throw new Error(
      "No NEXUS_FINANCE_SECRET / CRON_SECRET / NEXUS_POSTBACK_SECRET / POSTBACK_SHARED_SECRET / SERVER_SECRET found.",
    );
  }

  const pendingBefore = await prisma.nexusEarning.findMany({
    where: {
      status: "PENDING",
      releaseAt: { lte: new Date() },
      amount: { gt: 0 },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nexusConversionId: true,
      userId: true,
      amount: true,
      currency: true,
      status: true,
      releaseAt: true,
    },
  });

  console.log("\nMatured pending earnings BEFORE release:");
  console.table(
    pendingBefore.map((e) => ({
      earningId: e.id,
      conversionId: e.nexusConversionId,
      userId: e.userId,
      amount: String(e.amount),
      currency: e.currency,
      status: e.status,
      releaseAt: e.releaseAt?.toISOString() ?? "",
    })),
  );

  const res = await fetch("http://localhost:3000/api/nexus/finance/release", {
    method: "POST",
    headers: {
      "x-nexus-finance-secret": secret,
    },
  });

  const body = await res.json();

  console.log(`\nRelease API -> HTTP ${res.status}`);
  console.dir(body, { depth: null });

  if (!res.ok || body.ok !== true) {
    throw new Error("Finance release API failed.");
  }

  const ids = pendingBefore.map((e) => e.id);

  const earningsAfter = ids.length
    ? await prisma.nexusEarning.findMany({
        where: { id: { in: ids } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  const ledgerAfter = ids.length
    ? await prisma.nexusFinanceLedger.findMany({
        where: {
          nexusEarningId: { in: ids },
          kind: {
            in: [
              "EARNING_CREDIT",
              "RELEASE_PENDING_DEBIT",
              "RELEASE_AVAILABLE_CREDIT",
            ],
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  console.log("\nEarnings AFTER release:");
  console.table(
    earningsAfter.map((e) => ({
      earningId: e.id,
      amount: String(e.amount),
      status: e.status,
      availableAt: e.availableAt?.toISOString() ?? "",
    })),
  );

  console.log("\nRelease ledger rows:");
  console.table(
    ledgerAfter.map((l) => ({
      earningId: l.nexusEarningId,
      bucket: l.bucket,
      kind: l.kind,
      amount: String(l.amount),
      idempotencyKey: l.idempotencyKey,
    })),
  );

  const problems = [];

  for (const earning of pendingBefore) {
    const after = earningsAfter.find((x) => x.id === earning.id);
    const rows = ledgerAfter.filter((x) => x.nexusEarningId === earning.id);

    const initial = rows.filter(
      (x) => x.kind === "EARNING_CREDIT" && x.bucket === "PENDING",
    );
    const debit = rows.filter(
      (x) =>
        x.kind === "RELEASE_PENDING_DEBIT" &&
        x.bucket === "PENDING",
    );
    const credit = rows.filter(
      (x) =>
        x.kind === "RELEASE_AVAILABLE_CREDIT" &&
        x.bucket === "AVAILABLE",
    );

    const amount = Number(earning.amount);

    if (!after || after.status !== "AVAILABLE" || !after.availableAt) {
      problems.push(`${earning.id}: earning not AVAILABLE`);
    }

    if (
      initial.length !== 1 ||
      Number(initial[0]?.amount || 0) !== amount
    ) {
      problems.push(`${earning.id}: initial pending credit mismatch`);
    }

    if (
      debit.length !== 1 ||
      Number(debit[0]?.amount || 0) !== -amount
    ) {
      problems.push(`${earning.id}: pending debit mismatch`);
    }

    if (
      credit.length !== 1 ||
      Number(credit[0]?.amount || 0) !== amount
    ) {
      problems.push(`${earning.id}: available credit mismatch`);
    }
  }

  // Second call must be idempotent for the same matured rows.
  const resAgain = await fetch(
    "http://localhost:3000/api/nexus/finance/release",
    {
      method: "POST",
      headers: {
        "x-nexus-finance-secret": secret,
      },
    },
  );

  const bodyAgain = await resAgain.json();

  console.log(`\nSecond release API -> HTTP ${resAgain.status}`);
  console.dir(bodyAgain, { depth: null });

  if (!resAgain.ok || bodyAgain.ok !== true) {
    problems.push("second release call failed");
  }

  const ledgerSecond = ids.length
    ? await prisma.nexusFinanceLedger.findMany({
        where: {
          nexusEarningId: { in: ids },
          kind: {
            in: [
              "RELEASE_PENDING_DEBIT",
              "RELEASE_AVAILABLE_CREDIT",
            ],
          },
        },
      })
    : [];

  for (const earning of pendingBefore) {
    const rows = ledgerSecond.filter((x) => x.nexusEarningId === earning.id);
    const debits = rows.filter((x) => x.kind === "RELEASE_PENDING_DEBIT");
    const credits = rows.filter((x) => x.kind === "RELEASE_AVAILABLE_CREDIT");

    if (debits.length !== 1 || credits.length !== 1) {
      problems.push(`${earning.id}: duplicate release ledger rows detected`);
    }
  }

  if (problems.length) {
    console.error("\nFINANCE RELEASE SMOKE FAILED:");
    for (const problem of problems) console.error(" -", problem);
    process.exitCode = 1;
    return;
  }

  console.log("\nFINANCE RELEASE SMOKE PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
