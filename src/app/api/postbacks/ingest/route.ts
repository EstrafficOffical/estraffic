// src/app/api/postbacks/ingest/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import type { ConversionType } from "@prisma/client";

// Безопасный геттер параметров
function pick(params: URLSearchParams, key: string) {
  const v = params.get(key);
  return v == null || v === "" ? undefined : v;
}

// Пробуем восстановить offerId и userId по click_id из таблицы кликов
async function guessFromClick(clickId?: string) {
  if (!clickId) {
    return { offerId: null as string | null, userId: null as string | null };
  }
  const click = await prisma.click.findFirst({
    where: { clickId },
    select: { offerId: true, userId: true },
  });
  return { offerId: click?.offerId ?? null, userId: click?.userId ?? null };
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }

async function handle(req: Request) {
  const url = new URL(req.url);
  const isGet = req.method === "GET";
  const params = new URLSearchParams(isGet ? url.search : "");

  // Если POST — поддерживаем JSON и x-www-form-urlencoded; иначе fallback к query
  if (!isGet) {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      Object.entries(body || {}).forEach(([k, v]) => params.set(k, String(v)));
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const body = await req.text();
      new URLSearchParams(body).forEach((v, k) => params.set(k, v));
    } else {
      url.searchParams.forEach((v, k) => params.set(k, v));
    }
  }

  const clickId   = pick(params, "click_id") ?? pick(params, "subid") ?? pick(params, "sub1");
  const offerIdRaw = pick(params, "offer_id");
  const amount    = pick(params, "amount");
  const currency  = pick(params, "currency") ?? "USD";
  const txId      = pick(params, "tx_id");
  const rawStatus = (pick(params, "event") ?? pick(params, "status") ?? "REG").toUpperCase();

  // Приводим статус к вашему enum ConversionType
  const allowed = new Set<ConversionType>(["REG", "DEP", "REBILL", "SALE", "LEAD"] as any);
  const status  = (allowed.has(rawStatus as any) ? rawStatus : "REG") as ConversionType;

  // Пробуем дотянуть offerId/userId по click_id, если offer_id не пришёл
  const { offerId: guessedOfferId, userId: guessedUserId } = await guessFromClick(clickId);
  const effectiveOfferId = offerIdRaw ?? guessedOfferId;

  if (!effectiveOfferId) {
    return NextResponse.json(
      { ok: false, error: "Missing offer_id and unable to resolve from click_id" },
      { status: 400 }
    );
  }

  // Проверим, что оффер существует (иначе 400)
  const offer = await prisma.offer.findUnique({ where: { id: effectiveOfferId } });
  if (!offer) {
    return NextResponse.json(
      { ok: false, error: `Unknown offer_id: ${effectiveOfferId}` },
      { status: 400 }
    );
  }

  // Мягкая дедупликация: если пришёл tx_id и уже есть такая запись — вернём существующий id
  if (txId) {
    const existed = await prisma.conversion.findFirst({
      where: { offerId: offer.id, txId },
      select: { id: true },
    });
    if (existed) {
      return NextResponse.json({ ok: true, id: existed.id, dedup: true });
    }
  }

  // Создаём конверсию
  const conv = await prisma.conversion.create({
    data: {
      userId: guessedUserId,           // подтянули из клика (если было)
      offerId: offer.id,               // гарантированно валиден
      subId: clickId ?? null,          // обычно сюда кладут click_id/subid
      type: status,                    // REG/DEP/SALE/LEAD/REBILL
      amount: amount ? Number(amount) : null,
      currency,
      txId: txId ?? null,
    },
  });

  return NextResponse.json({ ok: true, id: conv.id });
}
