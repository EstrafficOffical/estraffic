// src/app/api/postbacks/ingest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ConversionType } from "@prisma/client";

export const runtime = "nodejs";

const SERVER_SECRET = process.env.POSTBACK_SHARED_SECRET ?? "";

/** Маппинг строки в ConversionType */
function toConvType(ev?: string | null): ConversionType | null {
  const v = (ev ?? "").toUpperCase();
  if (v === "REG") return "REG";
  if (v === "DEP" || v === "DEPOSIT") return "DEP";
  if (v === "REBILL") return "REBILL";
  if (v === "SALE" || v === "PURCHASE") return "SALE";
  if (v === "LEAD") return "LEAD";
  return null;
}

/** HMAC проверки: сравнение тайминг-безопасно */
function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  try {
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Проверка авторизации */
function isAuthorized(
  rawBody: string,
  bodySecret?: string | null,
  signature?: string | null
) {
  if (!SERVER_SECRET) return false;

  // Приоритет: HMAC по сырому телу
  if (signature && signature.length >= 16) {
    const expectedBuf = createHmac("sha256", SERVER_SECRET)
      .update(rawBody)
      .digest(); // Buffer
    const givenBuf = Buffer.from(signature.trim(), "hex"); // Buffer

    // Приводим Buffer → Uint8Array (TS доволен)
    const expected = new Uint8Array(
      expectedBuf.buffer,
      expectedBuf.byteOffset,
      expectedBuf.byteLength
    );
    const given = new Uint8Array(
      givenBuf.buffer,
      givenBuf.byteOffset,
      givenBuf.byteLength
    );

    return safeEqual(expected, given);
  }

  // Фоллбек: plain secret в JSON
  return bodySecret === SERVER_SECRET;
}

/** Нормализация имен полей: принимаем snake и camel */
function pick<T = string>(obj: any, keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v as T;
  }
  return undefined;
}

async function handle(req: NextRequest, raw: string, body: any) {
  const signature = req.headers.get("x-signature");
  if (!isAuthorized(raw, body?.secret, signature)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const offerId = String(pick(body, ["offer_id", "offerId"]) ?? "").trim();
  const txId = (pick<string>(body, ["tx_id", "txId"]) ?? "").toString().trim();
  const event = pick<string>(body, ["event", "type"]);
  const convType = toConvType(event ?? null);

  const amountRaw = pick(body, ["amount"]);
  const amount = amountRaw != null ? Number(amountRaw) : null;
  const currency = pick<string>(body, ["currency"]);

  const clickId = pick<string>(body, ["click_id", "clickId"]);
  const subId = pick<string>(body, ["sub_id", "subId"]);

  if (!offerId) {
    return NextResponse.json({ ok: false, error: "offer_id required" }, { status: 400 });
  }
  // txId может отсутствовать — тогда создадим «сырую» запись без идемпотентности.

  // Пытаемся найти userId по клику (приоритет click_id)
  let userId: string | null = null;
  if (clickId || subId) {
    const lastClick = await prisma.click.findFirst({
      where: {
        offerId,
        OR: [
          clickId ? { clickId } : undefined,
          subId ? { subId } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "desc" },
      select: { userId: true },
    });
    userId = lastClick?.userId ?? null;
  }

  // Если есть txId — идемпотентный upsert
  if (txId) {
    const saved = await prisma.conversion.upsert({
      where: { offerId_txId: { offerId, txId } },
      update: {
        userId: userId ?? undefined,
        type: convType ?? undefined,
        amount: amount ?? undefined,
        currency: currency ?? undefined,
        subId: subId ?? undefined,
      },
      create: {
        offerId,
        txId,
        userId: userId ?? undefined,
        type: convType ?? "REG",
        amount: amount ?? undefined,
        currency: currency ?? undefined,
        subId: subId ?? undefined,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  }

  // Иначе — обычный insert
  const created = await prisma.conversion.create({
    data: {
      offerId,
      txId: null,
      userId: userId ?? undefined,
      type: convType ?? "REG",
      amount: amount ?? undefined,
      currency: currency ?? undefined,
      subId: subId ?? undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: created.id });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }
    return await handle(req, raw, data);
  } catch (e) {
    console.error("POST /postbacks/ingest error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

// Для отладки: поддержим GET c query
export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const p = u.searchParams;
    const body = {
      secret: p.get("secret"),
      offer_id: p.get("offer_id"),
      tx_id: p.get("tx_id"),
      event: p.get("event"),
      amount: p.get("amount"),
      currency: p.get("currency"),
      click_id: p.get("click_id") ?? p.get("clickId"),
      sub_id: p.get("sub_id") ?? p.get("subId"),
    };
    const raw = JSON.stringify(body);
    return await handle(req, raw, body);
  } catch (e) {
    console.error("GET /postbacks/ingest error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
