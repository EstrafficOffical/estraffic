// src/app/api/postbacks/favbet/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, $Enums } from "@prisma/client";

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

const STATUS_MAP: Record<string, $Enums.ConversionStatus> = {
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

function normalizeStatus(v?: string): $Enums.ConversionStatus {
  if (!v) return "CONFIRMED";
  const key = v.toLowerCase().trim();
  return STATUS_MAP[key] ?? "CONFIRMED";
}

function safeNumber(s?: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Заглушка для HMAC — включишь, когда появится secret
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

  const status = normalizeStatus(q.status);

  // amount → строка для Decimal (безопасно для тайпчека)
  const amountNum = safeNumber(q.p1) ?? safeNumber(q.amount) ?? null;
  const amountStr: string | null = amountNum === null ? null : String(amountNum);

  const externalId =
    (q.ext_id && q.ext_id.trim()) ||
    `${cid}:${q.goal_id ?? ""}:${q.time ?? ""}`;

  try {
    // формируем данные для create/update с явной типизацией Unchecked*
    const createData = {
      externalId,
      clickId: cid ?? null,
      status,                   // $Enums.ConversionStatus
      amount: amountStr as any, // Prisma.Decimal допускает строку
      source: "FAVBET" as string | null,
    } as Prisma.ConversionUncheckedCreateInput;

    const updateData = {
      clickId: cid ?? null,
      status,                   // $Enums.ConversionStatus
      amount: amountStr as any, // строка под Decimal
      source: "FAVBET" as string | null,
    } as Prisma.ConversionUncheckedUpdateInput;

    await prisma.conversion.upsert({
      where: { externalId },
      create: createData,
      update: updateData,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[favbet-postback]", {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    });
    return NextResponse.json({ ok: false, error: "internal" }, { status: 200 });
  }
}
