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
  env.NEXUS_POSTBACK_SECRET ||
  env.POSTBACK_SHARED_SECRET ||
  env.SERVER_SECRET;

const prisma = new PrismaClient();

(async () => {
  if (!secret) {
    throw new Error(
      "No NEXUS_POSTBACK_SECRET / POSTBACK_SHARED_SECRET / SERVER_SECRET found.",
    );
  }

  const click = await prisma.nexusClick.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      clickId: true,
      flowId: true,
      termsVersionId: true,
      affiliateCpaSnapshot: true,
      advertiserCpaSnapshot: true,
      currencySnapshot: true,
      capFtdSnapshot: true,
      createdAt: true,
    },
  });

  if (!click) {
    throw new Error("No NexusClick found. Open a tracking link first.");
  }

  console.log("\nLatest NexusClick:");
  console.table([
    {
      clickId: click.clickId,
      flowId: click.flowId,
      termsVersionId: click.termsVersionId,
      affiliateCpa: String(click.affiliateCpaSnapshot ?? ""),
      advertiserCpa: String(click.advertiserCpaSnapshot ?? ""),
      currency: click.currencySnapshot ?? "",
      capFtd: click.capFtdSnapshot ?? "",
      createdAt: click.createdAt.toISOString(),
    },
  ]);

  if (click.currencySnapshot == null && click.affiliateCpaSnapshot == null) {
    console.log(
      "\nWARNING: this click predates STEP 8C.1 snapshots. Open the tracking link once more and rerun this smoke test.",
    );
    return;
  }

  const base = "http://localhost:3000/api/nexus/postback";
  const stamp = Date.now();
  const depTxId = `smoke-ftd-${stamp}`;

  const send = async (event, txId, status = "approved") => {
    const url = new URL(base);
    url.searchParams.set("click_id", click.clickId);
    url.searchParams.set("event", event);
    url.searchParams.set("tx_id", txId);
    url.searchParams.set("status", status);
    url.searchParams.set("source", "SMOKE");

    const res = await fetch(url, {
      headers: {
        "x-nexus-postback-secret": secret,
      },
    });

    const body = await res.json();
    console.log(`\n${event} -> HTTP ${res.status}`);
    console.dir(body, { depth: null });
    return body;
  };

  const reg = await send("REG", `smoke-reg-${stamp}`);
  const dep = await send("FTD", depTxId);

  // Idempotency test: same FTD tx_id must update the same conversion,
  // and must not create duplicate finance entries.
  const depAgain = await send("FTD", depTxId);

  const storedDep = await prisma.nexusConversion.findUnique({
    where: {
      source_txId: {
        source: "SMOKE",
        txId: depTxId,
      },
    },
  });

  if (!storedDep) {
    throw new Error("Smoke FTD conversion was not stored.");
  }

  const earning = await prisma.nexusEarning.findUnique({
    where: {
      nexusConversionId: storedDep.id,
    },
  });

  const earningLedger = await prisma.nexusFinanceLedger.findMany({
    where: {
      nexusConversionId: storedDep.id,
      kind: "EARNING_CREDIT",
      bucket: "PENDING",
    },
    orderBy: { createdAt: "asc" },
  });

  console.log("\nFinance records for smoke FTD:");
  console.table([
    {
      conversionId: storedDep.id,
      affiliatePayout: String(storedDep.affiliatePayout),
      earningId: earning?.id ?? "",
      earningStatus: earning?.status ?? "",
      earningAmount: String(earning?.amount ?? ""),
      releaseAt: earning?.releaseAt?.toISOString() ?? "",
      pendingLedgerRows: earningLedger.length,
      pendingLedgerAmount:
        earningLedger.length === 1 ? String(earningLedger[0].amount) : "",
    },
  ]);

  const payout = Number(storedDep.affiliatePayout || 0);

  const result = {
    regOk: reg.ok === true,
    depOk: dep.ok === true,
    depDedupOnSecondSend: depAgain.dedup === true,
    earningExists: Boolean(earning),
    earningPending: earning?.status === "PENDING",
    earningAmountMatches:
      earning != null && Number(earning.amount) === payout && payout > 0,
    exactlyOnePendingLedgerRow: earningLedger.length === 1,
    pendingLedgerAmountMatches:
      earningLedger.length === 1 &&
      Number(earningLedger[0].amount) === payout &&
      payout > 0,
    secondSendCreatedNoFinanceDuplicates:
      depAgain?.finance?.earningCreated === false &&
      depAgain?.finance?.ledgerCreated === false,
  };

  console.log("\nSmoke result:");
  console.log(result);

  const passed = Object.values(result).every(Boolean);

  if (!passed) {
    throw new Error("NEXUS postback + finance smoke test failed.");
  }

  console.log("\nPOSTBACK + FINANCE SMOKE PASSED.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
