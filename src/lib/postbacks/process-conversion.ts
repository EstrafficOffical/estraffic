import { prisma } from "@/lib/prisma";

export type ConversionEvent = "REG" | "DEP" | "REBILL" | "SALE" | "LEAD";

type ProcessInput = {
  clickId: string;
  offerId?: string;
  txId: string;
  event: ConversionEvent;
  amount?: number | null;
  currency?: string | null;
  source?: string | null;
  externalId?: string | null;
  status?: string | null;
  data?: any;
  createdAt?: Date;
  useCapForDep?: boolean; // для ingest=true, для favbet/vegas по желанию тоже можно true
};

type ProcessResult =
  | {
      ok: true;
      id: string;
      dedup?: boolean;
      type: ConversionEvent;
      amount: number;
      offerId: string;
      userId: string | null;
      source?: string | null;
    }
  | {
      ok: false;
      error: string;
      code?: number;
    };

export async function processConversion(input: ProcessInput): Promise<ProcessResult> {
  const {
    clickId,
    offerId,
    txId,
    event,
    amount,
    currency,
    source,
    externalId,
    status,
    data,
    createdAt,
    useCapForDep = false,
  } = input;

  if (!clickId) return { ok: false, error: "MISSING_CLICK_ID", code: 400 };
  if (!txId) return { ok: false, error: "MISSING_TX_ID", code: 400 };

  const click = await prisma.click.findFirst({
    where: offerId ? { clickId, offerId } : { clickId },
    select: {
      userId: true,
      offerId: true,
      subId: true,
      clickId: true,
    },
  });

  if (!click?.offerId) {
    return { ok: false, error: "CLICK_NOT_FOUND", code: 404 };
  }

  const finalOfferId = click.offerId;
  const finalUserId = click.userId ?? null;

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
    return { ok: false, error: "OFFER_NOT_AVAILABLE", code: 404 };
  }

  const existing = await prisma.conversion.findFirst({
    where: { offerId: finalOfferId, txId },
    select: { id: true, type: true, amount: true },
  });

  if (existing) {
    return {
      ok: true,
      id: existing.id,
      dedup: true,
      type: existing.type as ConversionEvent,
      amount: Number(existing.amount ?? 0),
      offerId: finalOfferId,
      userId: finalUserId,
      source: source ?? null,
    };
  }

  let finalAmount: number | null = amount ?? null;

  if (useCapForDep && event === "DEP") {
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
      userId: finalUserId ?? undefined,
      offerId: finalOfferId,
      subId: click.subId ?? undefined,
      type: event,
      amount: finalAmount ?? undefined,
      currency: currency ?? undefined,
      txId,
      source: source ?? undefined,
      externalId: externalId ?? undefined,
      status: status ?? undefined,
      clickId,
      data: data ?? undefined,
      ...(createdAt ? { createdAt } : {}),
    },
    select: {
      id: true,
      type: true,
      amount: true,
      offerId: true,
      userId: true,
      source: true,
    },
  });

  return {
    ok: true,
    id: conv.id,
    type: conv.type as ConversionEvent,
    amount: Number(conv.amount ?? 0),
    offerId: conv.offerId,
    userId: conv.userId ?? null,
    source: conv.source ?? null,
  };
}