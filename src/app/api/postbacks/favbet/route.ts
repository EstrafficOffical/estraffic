// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * FavBet S2S postback receiver
 * Ждём GET с полями: cid, status, ext_id, goal_id, goal, time, adv_cid, utm_*, p1..p4
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = Object.fromEntries(url.searchParams.entries()) as Record<string, string>;

    // обязательный click id
    const cid = (q.cid ?? "").trim();
    if (!cid) {
      return NextResponse.json({ ok: false, error: "cid missing" }, { status: 400 });
    }

    // нормализуем статус (если у тебя в БД enum — подстрой mapping)
    const status = (q.status ?? "CONFIRMED").toUpperCase();

    // payout: сначала amount, затем p1, иначе null
    const a1 = q.amount != null ? Number(q.amount) : undefined;
    const a2 = q.p1 != null ? Number(q.p1) : undefined;
    const payout = Number.isFinite(a1!) ? a1! : Number.isFinite(a2!) ? a2! : null;

    // внешний ID для идемпотентности
    const externalId = (q.ext_id && q.ext_id.trim()) || `${cid}:${q.goal_id ?? ""}`;

    // upsert вместо create — чтобы не плодить дубликаты
    await prisma.conversion.upsert({
      where: { externalId }, // в схеме нужно unique по externalId
      create: {
        externalId,
        clickId: cid as any,      // если этого поля нет — убери
        status: status as any,    // если enum — приведи к нужному
        amount: payout,           // null если не число
        source: "FAVBET" as any,  // если поля нет — убери
        data: q as any,           // JSON (если есть), удобно для отладки
      } as any,
      update: {
        status: status as any,
        amount: payout,
        data: q as any,
      } as any,
    });

    // всегда 200, чтобы сеть не шлёт повторно из-за 40x/50x
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("favbet postback error", e);
    // тоже 200 — но с ok:false, чтобы не зациклить ретраи у источника
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
