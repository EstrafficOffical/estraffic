// src/app/api/postbacks/ingest/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SERVER_SECRET =
  process.env.POSTBACK_SHARED_SECRET || process.env.SERVER_SECRET;

function ok(data: any) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

/**
 * Ингест постбеков.
 * Правила:
 * - авторизация ?secret=...;
 * - выплата идёт ТОЛЬКО на event=DEP;
 * - ЕДИНАЯ капа: Offer.cap — глобальный лимит оплаченных DEP (lifetime);
 * - дубли по (offerId, txId) игнорируем (возвращаем существующую запись);
 * - если капа исчерпана — записываем конверсию с amount=0.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // auth
    const secret = url.searchParams.get("secret");
    if (!SERVER_SECRET || secret !== SERVER_SECRET) {
      return bad("UNAUTHORIZED", 401);
    }

    // input (camel + snake)
    const clickId =
      url.searchParams.get("clickId") ||
      url.searchParams.get("click_id") ||
      undefined;
    const offerId = url.searchParams.get("offer_id") || undefined;
    const event = (url.searchParams.get("event") || "REG").toUpperCase() as
      | "REG"
      | "DEP"
      | "REBILL"
      | "SALE"
      | "LEAD";
    const txId = url.searchParams.get("tx_id") || undefined;
    const currency = (url.searchParams.get("currency") || "USD").toUpperCase();

    if (!clickId || !offerId) return bad("MISSING click_id or offer_id");
    if (!txId) return bad("MISSING tx_id");

    // find click (user/subId)
    const click = await prisma.click.findFirst({
      where: { clickId, offerId },
      select: { userId: true, subId: true, offerId: true },
    });
    if (!click) return bad("CLICK_NOT_FOUND", 404);

    // offer
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, hidden: false, status: "ACTIVE" },
      select: { id: true, cpa: true, cap: true },
    });
    if (!offer) return bad("OFFER_NOT_AVAILABLE", 404);

    // idempotency
    const existing = await prisma.conversion.findFirst({
      where: { offerId: offer.id, txId },
      select: { id: true },
    });
    if (existing) return ok({ id: existing.id, dedup: true });

    // payout
    let payout = 0;
    if (event === "DEP") {
      const cpa = Number(offer.cpa ?? 0);

      // сколько уже ОПЛАЧЕННЫХ DEP всего (lifetime)
      const paidTotal = await prisma.conversion.count({
        where: { offerId: offer.id, type: "DEP", amount: { gt: 0 as any } },
      });

      const overCap = offer.cap != null && paidTotal >= Number(offer.cap);
      payout = overCap ? 0 : cpa;
    }

    const conv = await prisma.conversion.create({
      data: {
        userId: click.userId ?? undefined,
        offerId: offer.id,
        subId: click.subId ?? undefined,
        type: event,
        amount: payout > 0 ? payout : 0,
        currency,
        txId,
      },
      select: { id: true, type: true, amount: true },
    });

    return ok({ id: conv.id, type: conv.type, amount: conv.amount });
  } catch (e: any) {
    return bad(e?.message || "INGEST_FAILED", 500);
  }
}
