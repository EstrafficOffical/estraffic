// src/app/api/postbacks/ingest/route.ts
import { NextResponse } from "next/server";
import { processConversion, type ConversionEvent } from "@/lib/postbacks/process-conversion";

const SERVER_SECRET =
  process.env.POSTBACK_SHARED_SECRET || process.env.SERVER_SECRET;

function ok(data: any) {
  return NextResponse.json({ ok: true, ...data });
}
function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const secret = url.searchParams.get("secret");
    if (!SERVER_SECRET || secret !== SERVER_SECRET) {
      return bad("UNAUTHORIZED", 401);
    }

    const clickId =
      url.searchParams.get("clickId") ||
      url.searchParams.get("click_id") ||
      undefined;

    const offerId = url.searchParams.get("offer_id") || undefined;
    const event = (url.searchParams.get("event") || "REG").toUpperCase() as ConversionEvent;
    const txId = url.searchParams.get("tx_id") || undefined;
    const currency = (url.searchParams.get("currency") || "USD").toUpperCase();

    if (!clickId || !offerId) return bad("MISSING click_id or offer_id");
    if (!txId) return bad("MISSING tx_id");

    const result = await processConversion({
      clickId,
      offerId,
      txId,
      event,
      currency,
      source: "INGEST",
      useCapForDep: true,
    });

    if (!result.ok) return bad(result.error, result.code || 400);

    return ok({
      id: result.id,
      dedup: result.dedup ?? false,
      type: result.type,
      amount: result.amount,
    });
  } catch (e: any) {
    return bad(e?.message || "INGEST_FAILED", 500);
  }
}