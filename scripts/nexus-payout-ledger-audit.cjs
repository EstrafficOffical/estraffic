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

const prisma = new PrismaClient();

(async () => {
  const payout = await prisma.nexusPayout.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!payout) {
    throw new Error("No NexusPayout found.");
  }

  const grouped = await prisma.nexusFinanceLedger.groupBy({
    by: ["bucket"],
    where: {
      userId: payout.userId,
      currency: payout.currency,
    },
    _sum: { amount: true },
  });

  const balances = Object.fromEntries(
    grouped.map((row) => [row.bucket, Number(row._sum.amount || 0)]),
  );

  const payoutLedger = await prisma.nexusFinanceLedger.findMany({
    where: { payoutId: payout.id },
    orderBy: { createdAt: "asc" },
  });

  console.log("\nLatest payout:");
  console.table([
    {
      id: payout.id,
      userId: payout.userId,
      amount: String(payout.amount),
      currency: payout.currency,
      status: payout.status,
      destinationLabel: payout.destinationLabel || "",
      destinationAddress: payout.destinationAddress,
      txHash: payout.txHash || "",
      requestedAt: payout.requestedAt.toISOString(),
      approvedAt: payout.approvedAt?.toISOString() || "",
      paidAt: payout.paidAt?.toISOString() || "",
      rejectedAt: payout.rejectedAt?.toISOString() || "",
    },
  ]);

  console.log("\nAffiliate finance balances:");
  console.table([
    {
      available: balances.AVAILABLE || 0,
      pending: balances.PENDING || 0,
      reserved: balances.RESERVED || 0,
      paid: balances.PAID || 0,
      totalEarned:
        (balances.AVAILABLE || 0) +
        (balances.PENDING || 0) +
        (balances.RESERVED || 0) +
        (balances.PAID || 0),
    },
  ]);

  console.log("\nLedger rows for latest payout:");
  console.table(
    payoutLedger.map((row) => ({
      bucket: row.bucket,
      kind: row.kind,
      amount: String(row.amount),
      idempotencyKey: row.idempotencyKey,
    })),
  );

  const amount = Number(payout.amount);
  const problems = [];

  if (payout.status === "REQUESTED" || payout.status === "APPROVED") {
    if (Math.abs((balances.RESERVED || 0) - amount) > 0.0001) {
      problems.push("requested/approved payout should remain in RESERVED");
    }
  }

  if (payout.status === "PAID") {
    if (Math.abs((balances.PAID || 0) - amount) > 0.0001) {
      problems.push("paid payout should be represented in PAID bucket");
    }

    const debit = payoutLedger.filter(
      (row) => row.kind === "PAYOUT_PAID_RESERVED_DEBIT",
    );
    const credit = payoutLedger.filter(
      (row) => row.kind === "PAYOUT_PAID_CREDIT",
    );

    if (debit.length !== 1 || Number(debit[0]?.amount || 0) !== -amount) {
      problems.push("paid reserved debit missing or incorrect");
    }

    if (credit.length !== 1 || Number(credit[0]?.amount || 0) !== amount) {
      problems.push("paid credit missing or incorrect");
    }
  }

  if (payout.status === "REJECTED") {
    if (Math.abs((balances.AVAILABLE || 0) - amount) > 0.0001) {
      problems.push("rejected payout should return amount to AVAILABLE");
    }

    const debit = payoutLedger.filter(
      (row) => row.kind === "PAYOUT_REJECT_RESERVED_DEBIT",
    );
    const credit = payoutLedger.filter(
      (row) => row.kind === "PAYOUT_REJECT_AVAILABLE_CREDIT",
    );

    if (debit.length !== 1 || Number(debit[0]?.amount || 0) !== -amount) {
      problems.push("reject reserved debit missing or incorrect");
    }

    if (credit.length !== 1 || Number(credit[0]?.amount || 0) !== amount) {
      problems.push("reject available credit missing or incorrect");
    }
  }

  if (problems.length) {
    console.error("\nPAYOUT LEDGER AUDIT FAILED:");
    for (const problem of problems) console.error(" -", problem);
    process.exitCode = 1;
    return;
  }

  console.log("\nPAYOUT LEDGER AUDIT PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
