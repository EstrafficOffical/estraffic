// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Простой приёмник FavBet S2S.
 * Ждём GET с параметрами из URL, которые мы указали в кабинете FavBet:
 * cid, status, ext_id, goal_id, goal, time, adv_cid, utm_*, p1..p4
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = Object.fromEntries(url.searchParams.entries());

    // Обязательное — click-id
    const cid = (q.cid || "").trim();
    if (!cid) return NextResponse.json({ ok: false, error: "cid missing" }, { status: 400 });

    // Парсим число (если решишь прокидывать выплату в param1/amount)
    const amount = q.amount ? Number(q.amount) : (q.p1 ? Number(q.p1) : null);
    const status = (q.status || "CONFIRMED").toUpperCase();

    // Ищем оффер/клик по своему storage (если у тебя есть таблица кликов — свяжи по cid).
    // Здесь сохраняем как Conversion (подправь поля под свою модель).
    await prisma.conversion.create({
  data: {
    // подставь реальные поля своей модели Conversion
    clickId: cid,                 // если есть
    status,                       // если есть
    amount: amount ?? undefined,  // если есть
    source: "FAVBET" as any,      // если нет поля — убери
    data: q as any,               // JSON-поле, если есть
  } as any,
});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("favbet postback error", e);
    return NextResponse.json({ ok: false }, { status: 200 }); // всегда 200, чтобы не дублировали
  }
}
