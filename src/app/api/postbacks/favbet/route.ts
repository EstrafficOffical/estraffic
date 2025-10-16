// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type FavbetRaw = {
  cid?: string;                 // {track_id}
  status?: string;              // {conversion_status}
  ext_id?: string;              // {conversion_id}
  goal_id?: string;             // {action_id}
  goal?: string;                // {action_name}
  time?: string;                // {conversion_time} (epoch seconds)
  adv_cid?: string;             // {conversion_adv_cid}
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  p1?: string; p2?: string; p3?: string; p4?: string;
  amount?: string;
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
function mapGoalToType(goalId?: string, goal?: string): "REG" | "DEP" | "REBILL" | "SALE" | "LEAD" {
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

  const cid = q.cid?.trim();
  if (!cid) {
    return NextResponse.json({ ok: false, error: "cid missing" }, { status: 200 });
  }
  if (!verifySignature(qs, q.sig)) {
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 200 });
  }

  // 1) находим клик по clickId = cid → берём userId/offerId/subId
  const click = await prisma.click.findFirst({
    where: { clickId: cid },
    select: { id: true, userId: true, offerId: true, subId: true },
  });

  if (!click?.userId || !click?.offerId) {
    // без привязки к юзеру офферу запись не попадёт в статистику — пропускаем
    return NextResponse.json({ ok: true, note: "click not found -> skipped" }, { status: 200 });
  }

  // 2) тип и сумма
  const amountNum = safeNumber(q.p1) ?? safeNumber(q.amount) ?? null;
  // если есть валидный amount — считаем это депозитом
  const convType: "REG" | "DEP" | "REBILL" | "SALE" | "LEAD" =
    amountNum !== null ? "DEP" : mapGoalToType(q.goal_id, q.goal);

  // 3) устойчивый txId для @@unique([offerId, txId])
  const txId = (q.ext_id?.trim()) || `${cid}:${q.goal_id ?? ""}:${q.time ?? ""}`;

  // 4) createdAt из epoch, если пришёл
  const createdAt =
    q.time && /^\d+$/.test(q.time) ? new Date(Number(q.time) * 1000) : undefined;

  try {
    await prisma.conversion.upsert({
      where: { offerId_txId: { offerId: click.offerId, txId } },
      create: {
        userId: click.userId,
        offerId: click.offerId,
        subId: click.subId ?? null,
        type: convType,                       // enum ConversionType
        amount: amountNum ?? null,            // Decimal? — число ок
        // currency можно задать по желанию, если требуется
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
    console.error("[favbet-postback]", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    // всегда 200, чтобы FavBet не ретраил
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
