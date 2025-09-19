// src/app/api/postbacks/ingest/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ipFromRequest, rateLimit } from "@/lib/rate-limit";
import { postbackSchema } from "@/lib/validation";

/** объединяем query + body */
async function readPayload(req: Request) {
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams);
  const ct = req.headers.get("content-type") || "";
  let body: any = {};
  if (req.method === "POST") {
    if (ct.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData().catch(() => null);
      if (form) {
        body = {};
        for (const [k, v] of form.entries()) body[k] = String(v);
      }
    }
  }
  return { ...query, ...body };
}

async function handle(req: Request) {
  // rate limit: 60/мин по IP
  const ip = ipFromRequest(req);
  const rl = rateLimit(`pb:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Too Many Requests" }, { status: 429 });

  const raw = await readPayload(req);
  const parsed = postbackSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Bad request", issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // секрет (если задан)
  const secret = process.env.POSTBACK_SHARED_SECRET?.trim();
  if (secret && data.secret !== secret) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  // оффер
  const offer = await prisma.offer.findUnique({ where: { id: data.offer_id }, select: { id: true } });
  if (!offer) return NextResponse.json({ ok: false, error: "Offer not found" }, { status: 404 });

  // идемпотентно по (offerId, txId)
  try {
    const conv = await prisma.conversion.upsert({
      where: { offerId_txId: { offerId: offer.id, txId: data.tx_id } } as any,
      update: {
        type: data.event,
        amount: data.amount ?? undefined,
        currency: data.currency ?? undefined,
        clickId: data.click_id ?? undefined,
        sub1: data.sub1 ?? undefined,
        sub2: data.sub2 ?? undefined,
        sub3: data.sub3 ?? undefined,
        sub4: data.sub4 ?? undefined,
        sub5: data.sub5 ?? undefined,
      } as any,
      create: {
        offerId: offer.id,
        txId: data.tx_id,
        type: data.event,
        amount: data.amount ?? null,
        currency: data.currency ?? null,
        clickId: data.click_id ?? null,
        sub1: data.sub1 ?? null,
        sub2: data.sub2 ?? null,
        sub3: data.sub3 ?? null,
        sub4: data.sub4 ?? null,
        sub5: data.sub5 ?? null,
      } as any,
    });
    return NextResponse.json({ ok: true, id: conv.id });
  } catch (e) {
    console.error("postback upsert error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
