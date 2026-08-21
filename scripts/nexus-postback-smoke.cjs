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
  const dep = await send("FTD", `smoke-ftd-${stamp}`);

  // Idempotency test: same FTD tx_id must update the same conversion, not create another one.
  const depAgain = await send("FTD", `smoke-ftd-${stamp}`);

  console.log("\nSmoke result:");
  console.log({
    regOk: reg.ok === true,
    depOk: dep.ok === true,
    depDedupOnSecondSend: depAgain.dedup === true,
  });

  const latest = await prisma.nexusConversion.findMany({
    where: {
      clickId: click.clickId,
      source: "SMOKE",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log("\nStored SMOKE conversions:");
  console.table(
    latest.map((c) => ({
      id: c.id,
      type: c.type,
      status: c.status,
      txId: c.txId,
      affiliatePayout: String(c.affiliatePayout),
      currency: c.currency,
    })),
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });