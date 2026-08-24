const fs = require("fs");
const path = require("path");

const root = process.cwd();
const vercelPath = path.join(root, "vercel.json");
const routePath = path.join(
  root,
  "src",
  "app",
  "api",
  "nexus",
  "finance",
  "release",
  "route.ts",
);

const config = JSON.parse(fs.readFileSync(vercelPath, "utf8"));
const route = fs.readFileSync(routePath, "utf8");

const cron = (config.crons || []).find(
  (item) => item.path === "/api/nexus/finance/release",
);

const checks = {
  "finance cron exists": Boolean(cron),
  "daily Hobby-safe schedule": cron?.schedule === "15 0 * * *",
  "route accepts CRON_SECRET": route.includes("process.env.CRON_SECRET"),
  "route accepts multiple configured secrets": route.includes("FINANCE_SECRETS.includes"),
  "GET handler exists": route.includes("export async function GET"),
  "POST handler preserved": route.includes("export async function POST"),
};

console.table(checks);

if (Object.values(checks).some((value) => !value)) {
  process.exitCode = 1;
  throw new Error("Finance cron audit failed.");
}

console.log("\nFINANCE CRON AUDIT PASSED.");