import { NextResponse } from "next/server";
import { ConversionType, NexusConversionStatus } from "@prisma/client";
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
    const txId = first(input, "tx_id", "txId", "transaction_id", "external_id", "ext_id");
    const source = normalizeSource(first(input, "source", "partner", "integration"));
    const type = mapType(first(input, "event", "type", "goal", "goal_id"));
    const status = mapStatus(first(input, "status", "state"));
    const advertiserAmount = numeric(first(input, "amount", "payout", "revenue", "p1"));
    const externalId = first(input, "external_id", "ext_id");
    const eventAt = parseEventAt(first(input, "event_at", "timestamp", "time", "ts"));

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
    let capReached = false;

    if (status === NexusConversionStatus.APPROVED && type === ConversionType.DEP) {
      if (
        existing?.status === NexusConversionStatus.APPROVED &&
        existing.type === ConversionType.DEP
      ) {
        affiliatePayout = Number(existing.affiliatePayout || 0);
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
          affiliatePayout = Number(click.affiliateCpaSnapshot || 0);
        }
      }
    }

    if (
      status === NexusConversionStatus.REJECTED ||
      status === NexusConversionStatus.REVERSED ||
      status === NexusConversionStatus.PENDING
    ) {
      affiliatePayout = 0;
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

    const saved = await prisma.nexusConversion.upsert({
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
        advertiserAmount: advertiserAmount ?? undefined,
        affiliatePayout,
        currency,
        raw,
        eventAt: eventAt ?? undefined,
      },
      update: {
        type,
        status,
        externalId,
        advertiserAmount: advertiserAmount ?? undefined,
        affiliatePayout,
        currency,
        raw,
        eventAt: eventAt ?? undefined,
      },
      select: {
        id: true,
        clickId: true,
        flowId: true,
        type: true,
        status: true,
        source: true,
        txId: true,
        advertiserAmount: true,
        affiliatePayout: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return response({
      ok: true,
      dedup: Boolean(existing),
      capReached,
      conversion: {
        ...saved,
        advertiserAmount:
          saved.advertiserAmount == null ? null : Number(saved.advertiserAmount),
        affiliatePayout: Number(saved.affiliatePayout || 0),
      },
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