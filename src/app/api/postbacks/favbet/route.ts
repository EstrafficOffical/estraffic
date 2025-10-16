// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type FavbetRaw = {
  // ИД клика (наш): лучше всего присылать click_id
  cid?: string;
  click_id?: string;
  track_id?: string;

  // Основные поля конверсии
  status?: string;      // {conversion_status}
  ext_id?: string;      // {conversion_id}
  goal_id?: string;     // {action_id}
  goal?: string;        // {action_name}
  time?: string;        // {conversion_time} (epoch seconds)
  amount?: string;      // {param1} или {amount} — сумма депозита

  // Прочие (храним как raw для дебага)
  adv_cid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  p1?: string; p2?: string; p3?: string; p4?: string;

  sig?: string;
};

// ---- helpers ----
function safeNumber(s?: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// заглушка HMAC — включишь, когда появится secret
function verifySignature(_raw: URLSearchParams, _sig?: string) {
  return true;
}

// Маппинг цели на ConversionType из твоего enum
function mapGoalToType(
  goalId?: string,
  goal?: string
): "REG" | "DEP" | "REBILL" | "SALE" | "LEAD" {
  const g = (goalId ?? goal ?? "").toLowerCase();
  if (g.includes("reg") || g.includes("signup") || g.includes("register")) return "REG";
  if (g.includes("dep") || g.includes("ftd") || g.includes("deposit") || g.includes("pay")) return "DEP";
  if (g.includes("rebill") || g.includes("recurr")) return "REBILL";
  if (g.includes("sale") || g.includes("purchase") || g.includes("order")) return "SALE";
  return "LEAD";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qs = new URLSearchParams(url.search);
  const q = Object.fromEntries(qs.entries()) as FavbetRaw;

  // принимаем id клика из трёх параметров (приоритет: cid -> click_id -> track_id)
  const cid = q.cid?.trim() || q.click_id?.trim() || q.track_id?.trim();
  if (!cid) {
    return NextResponse.json({ ok: false, error: "cid missing" }, { status: 200 });
  }
  if (!verifySignature(qs, q.sig)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 200 });
  }

  // ищем клик → получаем userId/offerId/subId
  const click = await prisma.click.findFirst({
    where: { clickId: cid },
    select: { id: true, userId: true, offerId: true, subId: true },
  });

  if (!click?.userId || !click?.offerId) {
    // без привязки к юзеру/офферу в стату не попадёт — пропускаем
    return NextResponse.json({ ok: true, note: "click not found -> skipped" }, { status: 200 });
  }

  // сумма/тип
  const amountNum = safeNumber(q.p1) ?? safeNumber(q.amount) ?? null;
  const convType: "REG" | "DEP" | "REBILL" | "SALE" | "LEAD" =
    amountNum !== null ? "DEP" : mapGoalToType(q.goal_id, q.goal);

  // устойчивый txId для @@unique([offerId, txId])
  const txId = (q.ext_id?.trim()) || `${cid}:${q.goal_id ?? ""}:${q.time ?? ""}`;

  // createdAt из epoch
  const createdAt =
    q.time && /^\d+$/.test(q.time) ? new Date(Number(q.time) * 1000) : undefined;

  // соберём «сырой» payload для отладки (необязательно)
  const rawData = {
    rawStatus: q.status ?? null,
    goal_id: q.goal_id ?? null,
    goal: q.goal ?? null,
    time: q.time ?? null,
    adv_cid: q.adv_cid ?? null,
    utm_source: q.utm_source ?? null,
    utm_medium: q.utm_medium ?? null,
    utm_campaign: q.utm_campaign ?? null,
    utm_term: q.utm_term ?? null,
    utm_content: q.utm_content ?? null,
    p1: q.p1 ?? null,
    p2: q.p2 ?? null,
    p3: q.p3 ?? null,
    p4: q.p4 ?? null,
    amount: q.amount ?? null,
  };

  try {
    await prisma.conversion.upsert({
      where: { offerId_txId: { offerId: click.offerId, txId } },
      create: {
        userId: click.userId,
        offerId: click.offerId,
        subId: click.subId ?? null,

        type: convType,
        amount: amountNum ?? null,
        txId,

        // 🔧 фикс: обязательно сохраняем clickId для связки с кликом
        clickId: cid,
        source: "FAVBET",

        // опционально — для прозрачности
        externalId: q.ext_id?.trim() || null,
        status: q.status ?? null,
        data: rawData as any,

        ...(createdAt ? { createdAt } : {}),
      },
      update: {
        type: convType,
        amount: amountNum ?? null,

        // 🔧 фикс и при апдейте
        clickId: cid,
        source: "FAVBET",

        externalId: q.ext_id?.trim() || null,
        status: q.status ?? null,
        data: rawData as any,

        ...(createdAt ? { createdAt } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[favbet-postback]", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    // всегда 200, чтобы FavBet не ретраил
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
