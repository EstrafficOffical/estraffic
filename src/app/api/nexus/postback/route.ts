import { NextResponse } from "next/server";
import {
  ConversionType,
  NexusConversionStatus,
  NexusEarningStatus,
  NexusFinanceBucket,
  NexusFinanceEntryKind,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type InputMap = Record<string, unknown>;

const SERVER_SECRET =
  process.env.NEXUS_POSTBACK_SECRET ||
  process.env.POSTBACK_SHARED_SECRET ||
  process.env.SERVER_SECRET;

function response(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function first(input: InputMap, ...keys: string[]) {
  for (const key of keys) {
    const value = input[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

function numeric(value?: string) {
  if (!value) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mapType(raw?: string): ConversionType {
  const v = (raw || "").trim().toLowerCase();

  if (["reg", "registration", "register", "signup", "sign_up"].includes(v)) {
    return ConversionType.REG;
  }

  if (["dep", "deposit", "ftd", "first_deposit", "firstdeposit"].includes(v)) {
    return ConversionType.DEP;
  }

  if (["rebill", "recurring", "repeat_deposit", "repeatdeposit"].includes(v)) {
    return ConversionType.REBILL;
  }

  if (["sale", "purchase", "order"].includes(v)) {
    return ConversionType.SALE;
  }

  return ConversionType.LEAD;
}

function mapStatus(raw?: string): NexusConversionStatus {
  const v = (raw || "approved").trim().toLowerCase();

  if (["pending", "hold", "processing", "review"].includes(v)) {
    return NexusConversionStatus.PENDING;
  }

  if (["rejected", "reject", "declined", "failed", "invalid"].includes(v)) {
    return NexusConversionStatus.REJECTED;
  }

  if (["reversed", "reverse", "chargeback", "cancelled", "canceled"].includes(v)) {
    return NexusConversionStatus.REVERSED;
  }

  return NexusConversionStatus.APPROVED;
}

function authorized(req: Request, input: InputMap) {
  if (!SERVER_SECRET) return false;

  const querySecret = first(input, "secret");
  const headerSecret = req.headers.get("x-nexus-postback-secret")?.trim();
  const auth = req.headers.get("authorization")?.trim();
  const bearer =
    auth && auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : undefined;

  return [querySecret, headerSecret, bearer].some(
    (candidate) => candidate && candidate === SERVER_SECRET,
  );
}

function normalizeSource(value?: string) {
  const normalized = (value || "GENERIC")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .slice(0, 64);

  return normalized || "GENERIC";
}

function parseEventAt(value?: string) {
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const n = Number(value);
    const ms = value.length <= 10 ? n * 1000 : n;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function readInput(req: Request): Promise<InputMap> {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());

  if (req.method === "GET") {
    return query;
  }

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return { ...query, ...(body && typeof body === "object" ? body : {}) };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    const body = form ? Object.fromEntries(form.entries()) : {};
    return { ...query, ...body };
  }

  return query;
}

async function handle(req: Request) {
  try {
    const input = await readInput(req);

    if (!authorized(req, input)) {
      return response({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    const clickId = first(input, "click_id", "clickId", "cid", "track_id");
    const txId = first(
      input,
      "tx_id",
      "txId",
      "transaction_id",
      "external_id",
      "ext_id",
    );
    const source = normalizeSource(
      first(input, "source", "partner", "integration"),
    );
    const type = mapType(first(input, "event", "type", "goal", "goal_id"));
    const status = mapStatus(first(input, "status", "state"));
    const incomingAdvertiserAmount = numeric(
      first(input, "amount", "payout", "revenue", "p1"),
    );
    const externalId = first(input, "external_id", "ext_id");
    const eventAt = parseEventAt(
      first(input, "event_at", "timestamp", "time", "ts"),
    );

    if (!clickId) {
      return response({ ok: false, error: "MISSING_CLICK_ID" }, 400);
    }

    if (!txId) {
      return response({ ok: false, error: "MISSING_TX_ID" }, 400);
    }

    const click = await prisma.nexusClick.findUnique({
      where: { clickId },
      select: {
        id: true,
        clickId: true,
        userId: true,
        flowId: true,
        termsVersionId: true,
        affiliateCpaSnapshot: true,
        advertiserCpaSnapshot: true,
        currencySnapshot: true,
        capFtdSnapshot: true,
      },
    });

    if (!click) {
      return response({ ok: false, error: "CLICK_NOT_FOUND" }, 404);
    }

    const existing = await prisma.nexusConversion.findUnique({
      where: {
        source_txId: {
          source,
          txId,
        },
      },
    });

    if (existing && existing.clickId !== clickId) {
      return response(
        {
          ok: false,
          error: "TX_ID_CONFLICT",
          existingClickId: existing.clickId,
        },
        409,
      );
    }

    let affiliatePayout = 0;
    let finalAdvertiserAmount = incomingAdvertiserAmount;
    let capReached = false;

    if (
      status === NexusConversionStatus.APPROVED &&
      type === ConversionType.DEP
    ) {
      if (
        existing?.status === NexusConversionStatus.APPROVED &&
        existing.type === ConversionType.DEP
      ) {
        // Idempotent replay: preserve economics already stored for this tx.
        affiliatePayout = Number(existing.affiliatePayout || 0);
        finalAdvertiserAmount =
          existing.advertiserAmount == null
            ? Number(click.advertiserCpaSnapshot || 0)
            : Number(existing.advertiserAmount);
      } else {
        const approvedDeposits = await prisma.nexusConversion.count({
          where: {
            userId: click.userId,
            flowId: click.flowId,
            type: ConversionType.DEP,
            status: NexusConversionStatus.APPROVED,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        });

        const cap =
          click.capFtdSnapshot == null ? null : Number(click.capFtdSnapshot);

        capReached = cap !== null && approvedDeposits >= cap;

        if (!capReached) {
          // CPA economics are frozen on NexusClick and are the source of truth.
          affiliatePayout = Number(click.affiliateCpaSnapshot || 0);
          finalAdvertiserAmount = Number(click.advertiserCpaSnapshot || 0);
        } else {
          affiliatePayout = 0;
          finalAdvertiserAmount = 0;
        }
      }
    }

    if (
      status === NexusConversionStatus.REJECTED ||
      status === NexusConversionStatus.REVERSED ||
      status === NexusConversionStatus.PENDING
    ) {
      affiliatePayout = 0;
      finalAdvertiserAmount = 0;
    }

    const currency =
      first(input, "currency")?.toUpperCase() ||
      click.currencySnapshot ||
      "USD";

    const raw = Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        typeof value === "string" ? value : String(value ?? ""),
      ]),
    );

    let fraudHoldDays = 0;

    if (click.termsVersionId) {
      const terms = await prisma.flowTermsVersion.findUnique({
        where: { id: click.termsVersionId },
        select: { fraudHoldDays: true },
      });

      fraudHoldDays = Math.max(0, Number(terms?.fraudHoldDays || 0));
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      const saved = await tx.nexusConversion.upsert({
        where: {
          source_txId: {
            source,
            txId,
          },
        },
        create: {
          nexusClickId: click.id,
          clickId: click.clickId,
          userId: click.userId,
          flowId: click.flowId,
          termsVersionId: click.termsVersionId,
          type,
          status,
          source,
          txId,
          externalId,
          advertiserAmount: finalAdvertiserAmount ?? undefined,
          affiliatePayout,
          currency,
          raw,
          eventAt: eventAt ?? undefined,
        },
        update: {
          type,
          status,
          externalId,
          advertiserAmount: finalAdvertiserAmount ?? undefined,
          affiliatePayout,
          currency,
          raw,
          eventAt: eventAt ?? undefined,
        },
        select: {
          id: true,
          nexusClickId: true,
          clickId: true,
          userId: true,
          flowId: true,
          termsVersionId: true,
          type: true,
          status: true,
          source: true,
          txId: true,
          advertiserAmount: true,
          affiliatePayout: true,
          currency: true,
          eventAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      let earning:
        | {
            id: string;
            status: NexusEarningStatus;
            amount: unknown;
            currency: string;
            releaseAt: Date | null;
          }
        | null = null;

      let earningCreated = false;
      let ledgerCreated = false;

      const payoutAmount = Number(saved.affiliatePayout || 0);

      if (
        saved.status === NexusConversionStatus.APPROVED &&
        saved.type === ConversionType.DEP &&
        payoutAmount > 0
      ) {
        const currentEarning = await tx.nexusEarning.findUnique({
          where: { nexusConversionId: saved.id },
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            releaseAt: true,
          },
        });

        if (currentEarning) {
          earning = currentEarning;
        } else {
          const earningBaseAt = saved.eventAt || saved.createdAt;
          const releaseAt = new Date(
            earningBaseAt.getTime() + fraudHoldDays * 24 * 60 * 60 * 1000,
          );

          earning = await tx.nexusEarning.create({
            data: {
              nexusConversionId: saved.id,
              userId: saved.userId,
              flowId: saved.flowId,
              termsVersionId: saved.termsVersionId,
              amount: saved.affiliatePayout,
              currency: saved.currency,
              status: NexusEarningStatus.PENDING,
              releaseAt,
            },
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              releaseAt: true,
            },
          });

          earningCreated = true;
        }

        const ledgerKey = `earning:${saved.id}:pending-credit`;

        const currentLedger = await tx.nexusFinanceLedger.findUnique({
          where: { idempotencyKey: ledgerKey },
          select: {
            id: true,
            amount: true,
            bucket: true,
            kind: true,
          },
        });

        if (currentLedger) {
          if (
            currentLedger.bucket !== NexusFinanceBucket.PENDING ||
            currentLedger.kind !== NexusFinanceEntryKind.EARNING_CREDIT ||
            Number(currentLedger.amount) !== payoutAmount
          ) {
            throw new Error("FINANCE_LEDGER_IDEMPOTENCY_CONFLICT");
          }
        } else {
          if (!earning) {
            throw new Error("FINANCE_EARNING_MISSING");
          }

          await tx.nexusFinanceLedger.create({
            data: {
              userId: saved.userId,
              currency: saved.currency,
              bucket: NexusFinanceBucket.PENDING,
              kind: NexusFinanceEntryKind.EARNING_CREDIT,
              amount: saved.affiliatePayout,
              nexusEarningId: earning.id,
              nexusConversionId: saved.id,
              idempotencyKey: ledgerKey,
              description: "Approved FTD affiliate earning",
              metadata: {
                source: saved.source,
                txId: saved.txId,
                clickId: saved.clickId,
                fraudHoldDays,
              },
            },
          });

          ledgerCreated = true;
        }
      }

      return {
        saved,
        earning,
        earningCreated,
        ledgerCreated,
      };
    });

    const saved = transactionResult.saved;

    const savedAdvertiserAmount =
      saved.advertiserAmount == null ? 0 : Number(saved.advertiserAmount);
    const savedAffiliatePayout = Number(saved.affiliatePayout || 0);
    const grossMargin = savedAdvertiserAmount - savedAffiliatePayout;
    const marginPercent =
      savedAdvertiserAmount > 0
        ? (grossMargin / savedAdvertiserAmount) * 100
        : 0;

    const finance = transactionResult.earning
      ? {
          earningId: transactionResult.earning.id,
          status: transactionResult.earning.status,
          amount: Number(transactionResult.earning.amount || 0),
          currency: transactionResult.earning.currency,
          releaseAt: transactionResult.earning.releaseAt,
          earningCreated: transactionResult.earningCreated,
          ledgerCreated: transactionResult.ledgerCreated,
        }
      : null;

    return response({
      ok: true,
      dedup: Boolean(existing),
      capReached,
      conversion: {
        ...saved,
        advertiserAmount: savedAdvertiserAmount,
        affiliatePayout: savedAffiliatePayout,
        grossMargin,
        marginPercent,
      },
      finance,
    });
  } catch (error: any) {
    console.error("[NEXUS POSTBACK ERROR]", error);
    return response(
      {
        ok: false,
        error: error?.message || "NEXUS_POSTBACK_FAILED",
      },
      500,
    );
  }
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
