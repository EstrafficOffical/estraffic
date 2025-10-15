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
  time?: string;                // {conversion_time}
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

// маппинг цели на ConversionType из твоего enum
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

  // amount: строкой (совместимо с Decimal)
  const amountNum = safeNumber(q.p1) ?? safeNumber(q.amount) ?? null;
  const amountStr = amountNum === null ? undefined : String(amountNum);

  // внешний id и txId (для твоего @@unique)
  const externalId = q.ext_id?.trim() || null;
  const txId = externalId || `${cid}:${q.time ?? ""}`;

  // тип конверсии + базовые поля
  const convType = mapGoalToType(q.goal_id, q.goal);
  const subId = cid;

  // resolve offerId
  let offerId = process.env.FAVBET_OFFER_ID;
  if (!offerId) {
    const offer = await prisma.offer.findFirst({
      where: {
        OR: [
          { title: { contains: "favbet", mode: "insensitive" } },
          { tag: { contains: "favbet", mode: "insensitive" } },
          { targetUrl: { contains: "favbet", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (offer) offerId = offer.id;
  }
  if (!offerId) {
    console.error("[favbet-postback] offerId unresolved", {
      hint: "set env FAVBET_OFFER_ID or create Offer with title/tag including 'favbet'",
      sample: { cid, ext_id: q.ext_id, goal_id: q.goal_id, time: q.time },
    });
    return NextResponse.json({ ok: false, error: "offerId unresolved" }, { status: 200 });
  }

  // соберём полезный raw payload (опционально, для отладки)
  const data = {
    rawStatus: q.status,
    goal_id: q.goal_id,
    goal: q.goal,
    time: q.time,
    adv_cid: q.adv_cid,
    utm_source: q.utm_source,
    utm_medium: q.utm_medium,
    utm_campaign: q.utm_campaign,
    utm_term: q.utm_term,
    utm_content: q.utm_content,
    p1: q.p1,
    p2: q.p2,
    p3: q.p3,
    p4: q.p4,
    amount: q.amount,
  };

  try {
    // идемпотентный upsert по композитному ключу (offerId, txId)
    await prisma.conversion.upsert({
      where: { offerId_txId: { offerId, txId } },
      create: {
        offerId,
        txId,
        type: convType,
        subId,
        ...(amountStr ? { amount: amountStr } : {}),
        // дополнительные поля:
        externalId: externalId ?? undefined,
        status: q.status ?? undefined,
        source: "FAVBET",
        clickId: cid,
        data,
      },
      update: {
        type: convType,
        subId,
        ...(amountStr ? { amount: amountStr } : {}),
        // обновим доп. поля тоже
        externalId: externalId ?? undefined,
        status: q.status ?? undefined,
        source: "FAVBET",
        clickId: cid,
        data,
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
