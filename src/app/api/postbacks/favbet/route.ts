// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// для Vercel/Next route handlers
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * Приёмник FavBet S2S (GET).
 * Ожидаем параметры:
 * cid, status, ext_id, goal_id, goal, time, adv_cid, utm_*, p1..p4, amount?
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = Object.fromEntries(url.searchParams.entries());

    // 1) обязательный click id
    const cid = (q.cid || "").trim();
    if (!cid) {
      return NextResponse.json({ ok: false, error: "cid missing" }, { status: 400 });
    }

    // 2) нормализуем статус
    const status = (q.status || "CONFIRMED").toUpperCase();

    // 3) payout: сначала q.amount, потом p1; иначе null
    const a1 = q.amount != null ? Number(q.amount) : undefined;
    const a2 = q.p1 != null ? Number(q.p1) : undefined;
    const payout = Number.isFinite(a1) ? (a1 as number) : Number.isFinite(a2) ? (a2 as number) : null;

    // 4) внешний ID для идемпотентности (если поле есть в БД — будем по нему дедуплицировать)
    const externalId = (q.ext_id && q.ext_id.trim()) || `${cid}:${q.goal_id ?? ""}`;

    // 5) общий payload под твою модель (подправляй имена полей при необходимости)
    const payload = {
      externalId,                 // если в модели нет — просто не будет использоваться
      clickId: cid as any,        // переименуй/убери под свою схему
      status: status as any,
      amount: payout,
      source: "FAVBET" as any,    // убери, если в модели нет
      data: q as any,             // JSON-поле, если есть
    } as any;

    // 6) «ручной upsert» с безопасной попыткой дедупликации по externalId,
    //    если такого поля нет — просто создаём запись.
    try {
      const existing = await prisma.conversion.findFirst({
        where: { externalId } as any,   // если поля нет — Prisma бросит ошибку, уйдём в catch ниже
        select: { id: true },
      });

      if (existing) {
        await prisma.conversion.update({
          where: { id: existing.id },
          data: payload,
        });
      } else {
        await prisma.conversion.create({ data: payload });
      }
    } catch {
      // Поля externalId в модели нет или другой shape — просто создаём
      await prisma.conversion.create({ data: payload });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("favbet postback error", e);
    // Возвращаем 200, чтобы источник не ретраил постбэк пачками
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
