// src/app/api/postbacks/vegas/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type VegasRaw = {
  // ID клика (наш UUID). Принимаем несколько алиасов на всякий случай.
  cid?: string;
  click_id?: string;
  track_id?: string;

  // Основные поля конверсии
  status?: string;      // статус у партнёра (confirmed/pending/rejected...)
  ext_id?: string;      // внешний id транзакции/конверсии (стабильный!)
  goal_id?: string;     // код действия
  goal?: string;        // имя действия
  time?: string;        // unix time (секунды)

  // Сумма/параметры (если сумма > 0 — считаем депозитом)
  amount?: string;
  p1?: string; p2?: string; p3?: string; p4?: string;

  // прочее
  sig?: string;
  adv_cid?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
};

function safeNumber(s?: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// заглушка signature — включишь при необходимости
function verifySignature(_raw: URLSearchParams, _sig?: string) {
  return true;
}

// маппинг цели → наш enum ConversionType
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
  const q = Object.fromEntries(qs.entries()) as VegasRaw;

  // Принимаем id клика из трёх вариантов
  const cid = q.cid?.trim() || q.click_id?.trim() || q.track_id?.trim();
  if (!cid) {
    return NextResponse.json({ ok: false, error: "cid missing" }, { status: 200 });
  }
  if (!verifySignature(qs, q.sig)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 200 });
  }

  // Ищем клик по нашему UUID → привязываем userId/offerId/subId
  const click = await prisma.click.findFirst({
    where: { clickId: cid },
    select: { id: true, userId: true, offerId: true, subId: true },
  });

  if (!click?.userId || !click?.offerId) {
    // Без привязки к юзеру/офферу в стату не попадёт — не создаём сироту
    return NextResponse.json({ ok: true, note: "click not found -> skipped" }, { status: 200 });
  }

  // Сумма и тип события
  const amountNum = safeNumber(q.amount) ?? safeNumber(q.p1) ?? null;
  const convType: "REG" | "DEP" | "REBILL" | "SALE" | "LEAD" =
    amountNum !== null ? "DEP" : mapGoalToType(q.goal_id, q.goal);

  // Устойчивый идентификатор транзакции для @@unique([offerId, txId])
  const txId = (q.ext_id?.trim()) || `${cid}:${q.goal_id ?? ""}:${q.time ?? ""}`;

  // createdAt из epoch (если пришёл)
  const createdAt =
    q.time && /^\d+$/.test(q.time) ? new Date(Number(q.time) * 1000) : undefined;

  try {
    await prisma.conversion.upsert({
      where: { offerId_txId: { offerId: click.offerId, txId } },
      create: {
        userId: click.userId!,
        offerId: click.offerId!,
        subId: click.subId ?? null,
        type: convType,                 // enum ConversionType
        amount: amountNum ?? null,      // Decimal? — число ок
        txId,
        ...(createdAt ? { createdAt } : {}),
      },
      update: {
        type: convType,
        amount: amountNum ?? null,
        ...(createdAt ? { createdAt } : {}),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[vegas-postback]", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    // всегда 200, чтобы партнёр не ретраил
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
