import { NextResponse } from "next/server";
import {
  NexusEarningStatus,
  NexusFinanceBucket,
  NexusFinanceEntryKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const FINANCE_SECRETS = [
  process.env.NEXUS_FINANCE_SECRET,
  process.env.CRON_SECRET,
  process.env.NEXUS_POSTBACK_SECRET,
  process.env.POSTBACK_SHARED_SECRET,
  process.env.SERVER_SECRET,
]
  .map((value) => value?.trim())
  .filter((value): value is string => Boolean(value));

function authorized(req: Request) {
  if (FINANCE_SECRETS.length === 0) return false;

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  const headerSecret = req.headers.get("x-nexus-finance-secret")?.trim();
  const postbackHeader = req.headers.get("x-nexus-postback-secret")?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const bearer =
    auth && auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : undefined;

  return [querySecret, headerSecret, postbackHeader, bearer].some(
    (candidate) =>
      Boolean(candidate) &&
      FINANCE_SECRETS.includes(candidate as string),
  );
}

async function releaseMaturedEarnings(limit: number) {
  const now = new Date();

  const candidates = await prisma.nexusEarning.findMany({
    where: {
      status: NexusEarningStatus.PENDING,
      releaseAt: {
        lte: now,
      },
      amount: {
        gt: 0,
      },
    },
    orderBy: [{ releaseAt: "asc" }, { createdAt: "asc" }],
    take: limit,
    select: {
      id: true,
      nexusConversionId: true,
      userId: true,
      amount: true,
      currency: true,
      releaseAt: true,
    },
  });

  const released: Array<{
    earningId: string;
    nexusConversionId: string;
    amount: number;
    currency: string;
    availableAt: Date;
  }> = [];

  let skipped = 0;

  for (const earning of candidates) {
    const result = await prisma.$transaction(async (tx) => {
      // Atomic claim: if another worker already released it, affected rows = 0.
      const claim = await tx.nexusEarning.updateMany({
        where: {
          id: earning.id,
          status: NexusEarningStatus.PENDING,
          releaseAt: {
            lte: now,
          },
        },
        data: {
          status: NexusEarningStatus.AVAILABLE,
          availableAt: now,
        },
      });

      if (claim.count !== 1) {
        return null;
      }

      await tx.nexusFinanceLedger.create({
        data: {
          userId: earning.userId,
          currency: earning.currency,
          bucket: NexusFinanceBucket.PENDING,
          kind: NexusFinanceEntryKind.RELEASE_PENDING_DEBIT,
          amount: Number(earning.amount) * -1,
          nexusEarningId: earning.id,
          nexusConversionId: earning.nexusConversionId,
          idempotencyKey: `earning:${earning.id}:release-pending-debit`,
          description: "Released matured earning from pending balance",
        },
      });

      await tx.nexusFinanceLedger.create({
        data: {
          userId: earning.userId,
          currency: earning.currency,
          bucket: NexusFinanceBucket.AVAILABLE,
          kind: NexusFinanceEntryKind.RELEASE_AVAILABLE_CREDIT,
          amount: earning.amount,
          nexusEarningId: earning.id,
          nexusConversionId: earning.nexusConversionId,
          idempotencyKey: `earning:${earning.id}:release-available-credit`,
          description: "Released matured earning to available balance",
        },
      });

      return {
        earningId: earning.id,
        nexusConversionId: earning.nexusConversionId,
        amount: Number(earning.amount),
        currency: earning.currency,
        availableAt: now,
      };
    });

    if (result) {
      // Fix the pending debit using a safe update inside a second guarded transaction
      // is intentionally avoided: both ledger rows must remain atomic.
      released.push(result);
    } else {
      skipped += 1;
    }
  }

  return {
    now,
    scanned: candidates.length,
    released,
    skipped,
  };
}

async function handle(req: Request) {
  try {
    if (!authorized(req)) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const url = new URL(req.url);
    const rawLimit = Number(url.searchParams.get("limit") || "200");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 200, 1), 500);

    const result = await releaseMaturedEarnings(limit);

    return NextResponse.json(
      {
        ok: true,
        scanned: result.scanned,
        releasedCount: result.released.length,
        skipped: result.skipped,
        released: result.released,
        now: result.now,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    console.error("[NEXUS FINANCE RELEASE ERROR]", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "NEXUS_FINANCE_RELEASE_FAILED",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
