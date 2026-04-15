import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type ConvEvent = "REG" | "DEP" | "REBILL" | "SALE" | "LEAD";
type SourceKind = "INGEST" | "FAVBET" | "VEGAS";

const SERVER_SECRET =
  process.env.POSTBACK_SHARED_SECRET || process.env.SERVER_SECRET;

function ok(data: any, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function bad(error: string, status = 400, extra?: Record<string, any>) {
  return NextResponse.json({ ok: false, error, ...(extra ?? {}) }, { status });
}

function safeNumber(v?: string | null): number | null {
  if (!v) return null;
  const n = Number(String(v).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function mapGoalToType(goalId?: string, goal?: string): ConvEvent {
  const g = (goalId ?? goal ?? "").toLowerCase();
  if (g.includes("reg") || g.includes("signup") || g.includes("register")) return "REG";
  if (g.includes("dep") || g.includes("ftd") || g.includes("deposit") || g.includes("pay")) return "DEP";
  if (g.includes("rebill") || g.includes("recurr")) return "REBILL";
  if (g.includes("sale") || g.includes("purchase") || g.includes("order")) return "SALE";
  return "LEAD";
}

function verifyPartnerSignature(_raw: URLSearchParams, _sig?: string) {
  return true;
}

type NormalizedPayload = {
  source: SourceKind;
  clickId: string;
  offerId?: string;
  txId: string;
  event: ConvEvent;
  amount: number | null;
  currency: string | null;
  externalId?: string | null;
  status?: string | null;
  createdAt?: Date;
  raw?: any;
  useCapForDep: boolean;
};

function normalizeIngest(url: URL): NormalizedPayload | { error: string; code?: number } {
  const secret = url.searchParams.get("secret");
  if (!SERVER_SECRET || secret !== SERVER_SECRET) {
    return { error: "UNAUTHORIZED", code: 401 };
  }

  const clickId =
    url.searchParams.get("clickId") ||
    url.searchParams.get("click_id") ||
    undefined;

  const offerId = url.searchParams.get("offer_id") || undefined;
  const event = (url.searchParams.get("event") || "REG").toUpperCase() as ConvEvent;
  const txId = url.searchParams.get("tx_id") || undefined;
  const currency = (url.searchParams.get("currency") || "USD").toUpperCase();

  if (!clickId || !offerId) return { error: "MISSING click_id or offer_id", code: 400 };
  if (!txId) return { error: "MISSING tx_id", code: 400 };

  return {
    source: "INGEST",
    clickId,
    offerId,
    txId,
    event,
    amount: null,
    currency,
    useCapForDep: true,
    raw: Object.fromEntries(url.searchParams.entries()),
  };
}

function normalizeFavbet(url: URL): NormalizedPayload | { error: string; code?: number } {
  const qs = url.searchParams;
  const secret = qs.get("secret");
  if (!SERVER_SECRET || secret !== SERVER_SECRET) {
    return { error: "UNAUTHORIZED", code: 401 };
  }

  const cid = qs.get("cid") || qs.get("click_id") || qs.get("track_id") || undefined;
  if (!cid) return { error: "cid missing", code: 400 };

  if (!verifyPartnerSignature(qs, qs.get("sig") || undefined)) {
    return { error: "bad signature", code: 400 };
  }

  const amountNum = safeNumber(qs.get("p1")) ?? safeNumber(qs.get("amount"));
  const event = amountNum !== null ? "DEP" : mapGoalToType(qs.get("goal_id") || undefined, qs.get("goal") || undefined);
  const txId =
    (qs.get("ext_id") || "").trim() ||
    `${cid}:${qs.get("goal_id") ?? ""}:${qs.get("time") ?? ""}`;

  const createdAt =
    qs.get("time") && /^\d+$/.test(qs.get("time")!)
      ? new Date(Number(qs.get("time")) * 1000)
      : undefined;

  const raw = {
    rawStatus: qs.get("status"),
    goal_id: qs.get("goal_id"),
    goal: qs.get("goal"),
    time: qs.get("time"),
    adv_cid: qs.get("adv_cid"),
    utm_source: qs.get("utm_source"),
    utm_medium: qs.get("utm_medium"),
    utm_campaign: qs.get("utm_campaign"),
    utm_term: qs.get("utm_term"),
    utm_content: qs.get("utm_content"),
    p1: qs.get("p1"),
    p2: qs.get("p2"),
    p3: qs.get("p3"),
    p4: qs.get("p4"),
    amount: qs.get("amount"),
  };

  return {
    source: "FAVBET",
    clickId: cid,
    txId,
    event,
    amount: amountNum,
    currency: "USD",
    externalId: qs.get("ext_id")?.trim() || null,
    status: qs.get("status") || null,
    createdAt,
    raw,
    useCapForDep: false,
  };
}

function normalizeVegas(url: URL): NormalizedPayload | { error: string; code?: number } {
  const qs = url.searchParams;
  const secret = qs.get("secret");
  if (!SERVER_SECRET || secret !== SERVER_SECRET) {
    return { error: "UNAUTHORIZED", code: 401 };
  }

  const cid = qs.get("cid") || qs.get("click_id") || qs.get("track_id") || undefined;
  if (!cid) return { error: "cid missing", code: 400 };

  if (!verifyPartnerSignature(qs, qs.get("sig") || undefined)) {
    return { error: "bad signature", code: 400 };
  }

  const amountNum = safeNumber(qs.get("amount")) ?? safeNumber(qs.get("p1"));
  const event = amountNum !== null ? "DEP" : mapGoalToType(qs.get("goal_id") || undefined, qs.get("goal") || undefined);
  const txId =
    (qs.get("ext_id") || "").trim() ||
    `${cid}:${qs.get("goal_id") ?? ""}:${qs.get("time") ?? ""}`;

  const createdAt =
    qs.get("time") && /^\d+$/.test(qs.get("time")!)
      ? new Date(Number(qs.get("time")) * 1000)
      : undefined;

  const raw = {
    rawStatus: qs.get("status"),
    goal_id: qs.get("goal_id"),
    goal: qs.get("goal"),
    time: qs.get("time"),
    adv_cid: qs.get("adv_cid"),
    utm_source: qs.get("utm_source"),
    utm_medium: qs.get("utm_medium"),
    utm_campaign: qs.get("utm_campaign"),
    utm_term: qs.get("utm_term"),
    utm_content: qs.get("utm_content"),
    p1: qs.get("p1"),
    p2: qs.get("p2"),
    p3: qs.get("p3"),
    p4: qs.get("p4"),
    amount: qs.get("amount"),
  };

  return {
    source: "VEGAS",
    clickId: cid,
    txId,
    event,
    amount: amountNum,
    currency: "USD",
    externalId: qs.get("ext_id")?.trim() || null,
    status: qs.get("status") || null,
    createdAt,
    raw,
    useCapForDep: false,
  };
}

async function processNormalized(input: NormalizedPayload) {
  const click = await prisma.click.findFirst({
    where: input.offerId
      ? { clickId: input.clickId, offerId: input.offerId }
      : { clickId: input.clickId },
    select: {
      userId: true,
      subId: true,
      offerId: true,
    },
  });

  if (!click?.offerId) {
    return { error: "CLICK_NOT_FOUND", code: 404 };
  }

  const finalOfferId = click.offerId;

  const offer = await prisma.offer.findFirst({
    where: {
      id: finalOfferId,
      hidden: false,
      status: "ACTIVE",
    },
    select: {
      id: true,
      cpa: true,
      cap: true,
    },
  });

  if (!offer) {
    return { error: "OFFER_NOT_AVAILABLE", code: 404 };
  }

  const existing = await prisma.conversion.findFirst({
    where: { offerId: finalOfferId, txId: input.txId },
    select: { id: true, type: true, amount: true },
  });

  if (existing) {
    return {
      id: existing.id,
      dedup: true,
      type: existing.type,
      amount: Number(existing.amount ?? 0),
    };
  }

  let finalAmount: number | null = input.amount;

  if (input.useCapForDep && input.event === "DEP") {
    const cpa = Number(offer.cpa ?? 0);

    const paidTotal = await prisma.conversion.count({
      where: {
        offerId: offer.id,
        type: "DEP",
        amount: { gt: 0 as any },
      },
    });

    const overCap = offer.cap != null && paidTotal >= Number(offer.cap);
    finalAmount = overCap ? 0 : cpa;
  }

  const conv = await prisma.conversion.create({
    data: {
      userId: click.userId ?? undefined,
      offerId: offer.id,
      subId: click.subId ?? undefined,
      type: input.event,
      amount: finalAmount ?? undefined,
      currency: input.currency ?? undefined,
      txId: input.txId,
      source: input.source,
      externalId: input.externalId ?? undefined,
      status: input.status ?? undefined,
      clickId: input.clickId,
      data: input.raw ?? undefined,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
    select: {
      id: true,
      type: true,
      amount: true,
    },
  });

  return {
    id: conv.id,
    dedup: false,
    type: conv.type,
    amount: Number(conv.amount ?? 0),
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sourceParam = (url.searchParams.get("source") || "INGEST").toUpperCase();

    let normalized: NormalizedPayload | { error: string; code?: number };

    if (sourceParam === "FAVBET") {
      normalized = normalizeFavbet(url);
    } else if (sourceParam === "VEGAS") {
      normalized = normalizeVegas(url);
    } else {
      normalized = normalizeIngest(url);
    }

    if ("error" in normalized) {
      return bad(normalized.error, normalized.code || 400);
    }

    const result = await processNormalized(normalized);
    if ("error" in result) {
      return bad(result.error, result.code || 400);
    }

    return ok(result);
  } catch (e: any) {
    return bad(e?.message || "UNIVERSAL_POSTBACK_FAILED", 500);
  }
}