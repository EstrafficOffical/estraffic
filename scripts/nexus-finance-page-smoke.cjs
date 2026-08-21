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
  const ledgerUser = await prisma.nexusFinanceLedger.findFirst({
    where: {
      currency: "USD",
      bucket: "AVAILABLE",
      amount: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    select: { userId: true },
  });

  if (!ledgerUser) {
    throw new Error("No user with positive AVAILABLE finance ledger balance found.");
  }

  const userId = ledgerUser.userId;

  const grouped = await prisma.nexusFinanceLedger.groupBy({
    by: ["bucket"],
    where: {
      userId,
      currency: "USD",
    },
    _sum: { amount: true },
  });

  const balances = Object.fromEntries(
    grouped.map((row) => [row.bucket, Number(row._sum.amount || 0)]),
  );

  console.log("\nLedger-backed finance balances:");
  console.table([
    {
      userId,
      pending: balances.PENDING || 0,
      available: balances.AVAILABLE || 0,
      reserved: balances.RESERVED || 0,
      paid: balances.PAID || 0,
      totalEarned:
        (balances.PENDING || 0) +
        (balances.AVAILABLE || 0) +
        (balances.RESERVED || 0) +
        (balances.PAID || 0),
    },
  ]);

  const earnings = await prisma.nexusEarning.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("\nRecent NEXUS earnings:");
  console.table(
    earnings.map((earning) => ({
      id: earning.id,
      conversionId: earning.nexusConversionId,
      amount: String(earning.amount),
      status: earning.status,
      releaseAt: earning.releaseAt?.toISOString() || "",
      availableAt: earning.availableAt?.toISOString() || "",
    })),
  );

  const payouts = await prisma.nexusPayout.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("\nRecent NEXUS payouts:");
  console.table(
    payouts.map((payout) => ({
      id: payout.id,
      amount: String(payout.amount),
      status: payout.status,
      destination: payout.destinationLabel || "",
      address: payout.destinationAddress,
    })),
  );

  if ((balances.AVAILABLE || 0) <= 0) {
    throw new Error("Expected a positive AVAILABLE balance after STEP 8E.3.");
  }

  console.log("\nFINANCE LIVE PAGE DATA SMOKE PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
