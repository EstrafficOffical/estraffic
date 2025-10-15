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

// строковый тип статуса — совместим и с String, и с enum
type Status = "CONFIRMED" | "REJECTED" | "PENDING";

const STATUS_MAP: Record<string, Status> = {
  confirmed: "CONFIRMED",
  approve:   "CONFIRMED",
  approved:  "CONFIRMED",
  paid:      "CONFIRMED",
  pending:   "PENDING",
  hold:      "PENDING",
  wait:      "PENDING",
  rejected:  "REJECTED",
  reject:    "REJECTED",
  cancel:    "REJECTED",
};

function normalizeStatus(v?: string): Status {
  if (!v) return "CONFIRMED";
  const key = v.toLowerCase().trim();
  return STATUS_MAP[key] ?? "CONFIRMED";
}

function safeNumber(s?: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Заглушка HMAC — включишь, когда появится secret
function verifySignature(_raw: URLSearchParams, _sig?: string) {
  return true;
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

  const status: Status = normalizeStatus(q.status);

  // Decimal безопасно передавать строкой; если нет — поле не отправляем
  const amountNum = safeNumber(q.p1) ?? safeNumber(q.amount) ?? null;
  const amountStr = amountNum === null ? undefined : String(amountNum);

  // устойчивый externalId (если ext_id нет — составной)
  const externalId =
    (q.ext_id && q.ext_id.trim()) ||
    `${cid}:${q.goal_id ?? ""}:${q.time ?? ""}`;

  // объекты для записи; amount — условно
  const createObj = {
    externalId,
    clickId: cid,
    status, // string
    ...(amountStr !== undefined ? { amount: amountStr } : {}),
    source: "FAVBET",
  };

  const updateObj = {
    clickId: cid,
    status, // string
    ...(amountStr !== undefined ? { amount: amountStr } : {}),
    source: "FAVBET",
  };

  try {
    // ручной upsert без уникального индекса
    const existing = await prisma.conversion.findFirst({
      where: { externalId },
      select: { id: true },
    });

    if (existing) {
      await prisma.conversion.update({
        where: { id: existing.id },
        data: updateObj as any,
      });
    } else {
      await prisma.conversion.create({
        data: createObj as any,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[favbet-postback]", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    // всегда 200, чтобы источник не ретраил
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
