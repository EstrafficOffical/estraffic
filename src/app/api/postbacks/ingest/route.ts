// src/app/api/postbacks/ingest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { ConversionType } from "@prisma/client";

// Важно: Нужен Node-рантайм (а не edge), чтобы работали Buffer/crypto.
export const runtime = "nodejs";

/** Секрет берём из .env */
const SERVER_SECRET = process.env.POSTBACK_SHARED_SECRET ?? "";

/** Маппинг event → Prisma enum */
function toConvType(ev?: string | null): ConversionType | null {
  const v = (ev ?? "").toUpperCase();
  if (v === "REG") return "REG";
  if (v === "DEP" || v === "DEPOSIT") return "DEP";
  if (v === "REBILL") return "REBILL";
  if (v === "SALE" || v === "PURCHASE") return "SALE";
  if (v === "LEAD") return "LEAD";
  return null;
}

/** Тайминг-безопасное сравнение двух hex-строк */
function safeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    // Преобразуем к ArrayBufferView, чтобы удовлетворить TS-тайпинги
    const av = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    const bv = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    return timingSafeEqual(av, bv);
  } catch {
    return false;
  }
}

/** Верификация подписи (если передана) или поля secret */
function verifyAuth(rawBody: string, jsonSecret?: string | null, headerSig?: string | null): boolean {
  if (!SERVER_SECRET) return false;

  // Если есть HMAC-подпись — проверяем её приоритетно
  if (headerSig && headerSig.length >= 16) {
    const expected = createHmac("sha256", SERVER_SECRET).update(rawBody).digest("hex");
    return safeEqualHex(headerSig, expected);
  }
  // Иначе проверяем секрет в самом JSON
  return typeof jsonSecret === "string" && safeEqualHex(jsonSecret, Buffer.from(SERVER_SECRET).toString("hex"));
}

/** Общая логика обработки запроса */
async function handle(body: any, rawBody: string, req: NextRequest) {
  // Авторизация: либо X-Signature, либо { secret }
  const headerSig = req.headers.get("x-signature");
  if (!verifyAuth(rawBody, body?.secret, headerSig)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const offerId = String(body?.offer_id ?? "").trim();
  const txId = String(body?.tx_id ?? "").trim();
  if (!offerId || !txId) {
    return NextResponse.json({ ok: false, error: "offer_id and tx_id are required" }, { status: 400 });
  }

  const convType = toConvType(body?.event ?? null);
  const amount = body?.amount != null ? Number(body.amount) : null;
  const currency = body?.currency ? String(body.currency) : null;
  const subId = body?.subId ? String(body.subId) : null;
  const clickId = body?.clickId ? String(body.clickId) : null;

  // Пытаемся найти userId по последнему клику (subId/clickId)
  let userId: string | null = null;
  if (subId || clickId) {
    const lastClick = await prisma.click.findFirst({
      where: {
        offerId: offerId,
        OR: [
          subId ? { subId } : undefined,
          clickId ? { clickId } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "desc" },
      select: { userId: true },
    });
    userId = lastClick?.userId ?? null;
  }

  // Идемпотентный upsert по (offerId, txId)
  const saved = await prisma.conversion.upsert({
    where: { offerId_txId: { offerId, txId } },
    update: {
      userId,
      type: convType ?? undefined,
      amount: amount ?? undefined,
      currency: currency ?? undefined,
    },
    create: {
      offerId,
      txId,
      userId,
      type: convType ?? "REG",
      amount: amount,
      currency: currency,
      subId: subId ?? undefined,
      // createdAt проставится по default(now())
    },
    select: { id: true, offerId: true, txId: true },
  });

  return NextResponse.json({ ok: true, id: saved.id });
}

/** POST — основной путь (используем сырой body для HMAC) */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }
    return await handle(data, raw, req);
  } catch (e) {
    console.error("POST /postbacks/ingest error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

/** GET — вспомогательный для отладки (параметры в query) */
export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);
    const params = u.searchParams;
    const body = {
      secret: params.get("secret"),
      offer_id: params.get("offer_id"),
      tx_id: params.get("tx_id"),
      event: params.get("event"),
      amount: params.get("amount") ? Number(params.get("amount")) : undefined,
      currency: params.get("currency"),
      subId: params.get("subId"),
      clickId: params.get("clickId"),
    };
    // Для HMAC при GET берём «сырой» аналог — строку query без подписи (условно)
    const raw = JSON.stringify(body);
    return await handle(body, raw, req);
  } catch (e) {
    console.error("GET /postbacks/ingest error", e);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
