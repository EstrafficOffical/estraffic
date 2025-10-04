// src/app/api/postbacks/ingest/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SERVER_SECRET =
  process.env.POSTBACK_SHARED_SECRET || process.env.SERVER_SECRET;

/** Удобные ответы */
function ok(data: any) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

/**
 * Ингест постбеков.
 * Правила:
 * - авторизация простым секретом (?secret=...);
 * - выплата идёт ТОЛЬКО на event=DEP;
 * - капы: capDaily / capMonthly (оплаченные DEP за сегодня/месяц);
 * - дубли по (offerId, txId) игнорируем (возвращаем существующую запись);
 * - amount = 0 если кап переполнен (но конверсию записываем).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // --- авторизация ---
    const secret = url.searchParams.get("secret");
    if (!SERVER_SECRET || secret !== SERVER_SECRET) {
      return bad("UNAUTHORIZED", 401);
    }

    // --- входные поля (поддержка snake и camel) ---
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

    // --- найдём клик (привязка user/subId) ---
    const click = await prisma.click.findFirst({
      where: { clickId, offerId },
      select: { userId: true, subId: true, offerId: true },
    });
    if (!click) return bad("CLICK_NOT_FOUND", 404);

    // --- оффер ---
    const offer = await prisma.offer.findFirst({
      where: { id: offerId, hidden: false, status: "ACTIVE" },
      select: { id: true, cpa: true, capDaily: true, capMonthly: true },
    });
    if (!offer) return bad("OFFER_NOT_AVAILABLE", 404);

    // --- идемпотентность по (offerId, txId) ---
    const existing = await prisma.conversion.findFirst({
      where: { offerId: offer.id, txId },
      select: { id: true },
    });
    if (existing) return ok({ id: existing.id, dedup: true });

    // --- расчёт выплаты ---
    let payout = 0;

    if (event === "DEP") {
      const cpa = Number(offer.cpa ?? 0);

      // границы UTC (правильно для сравнения в БД)
      const now = new Date();
      const startOfDayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );
      const startOfMonthUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
      );

      // сколько уже ОПЛАЧЕННЫХ DEP (amount > 0)
      const wherePaidDep = {
        offerId: offer.id,
        type: "DEP" as const,
        amount: { gt: 0 as any },
      };

      const [paidToday, paidMonth] = await Promise.all([
        prisma.conversion.count({
          where: { ...wherePaidDep, createdAt: { gte: startOfDayUTC } },
        }),
        prisma.conversion.count({
          where: { ...wherePaidDep, createdAt: { gte: startOfMonthUTC } },
        }),
      ]);

      const overDaily =
        offer.capDaily != null && paidToday >= Number(offer.capDaily);
      const overMonthly =
        offer.capMonthly != null && paidMonth >= Number(offer.capMonthly);

      payout = overDaily || overMonthly ? 0 : cpa;
    } else {
      payout = 0;
    }

    // --- создаём конверсию ---
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
      select: { id: true, type: true, amount: true, currency: true, subId: true },
    });

    return ok({ id: conv.id, type: conv.type, amount: conv.amount });
  } catch (e: any) {
    return bad(e?.message || "INGEST_FAILED", 500);
  }
}
