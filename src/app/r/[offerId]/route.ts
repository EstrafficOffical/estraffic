// src/app/r/[offerId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const runtime = "nodejs";        // принудительно Node
export const dynamic = "force-dynamic"; // отключаем статизацию/кеш

// ── helpers ───────────────────────────────────────────────────────────────────
function applyClickPlaceholders(
  targetUrl: string,
  click: { clickId?: string | null; subId?: string | null; userId?: string | null }
) {
  const cid = click.clickId ?? "";
  const sub = click.subId ?? "";
  const uid = click.userId ?? "";

  try {
    const u = new URL(targetUrl);

    // 1) param1:
    //    - если отсутствует → добавим param1=<clickId>
    //    - если равен "click_id" | "{clickId}" | "{param1}" → заменим на реальный <clickId>
    if (!u.searchParams.has("param1")) {
      u.searchParams.set("param1", cid);
    } else {
      const v = u.searchParams.get("param1") || "";
      if (v === "click_id" || v === "{clickId}" || v === "{param1}") {
        u.searchParams.set("param1", cid);
      }
    }

    // 2) подстрахуем click_id (многим сеткам так удобнее видеть кладённый id)
    if (!u.searchParams.has("click_id")) {
      u.searchParams.set("click_id", cid);
    }

    // 3) заменим плейсхолдеры в строке (если они встречаются в пути/других параметрах)
    let s = u.toString();
    s = s
      .replaceAll("{clickId}", cid)
      .replaceAll("{subId}", sub)
      .replaceAll("{userId}", uid);

    return s;
  } catch {
    // если целевой URL кривой — вернём как есть, чтобы не ломать поток
    return targetUrl;
  }
}

// GET /r/:offerId?subid=&sub_id=&source=&user=
export async function GET(req: Request, ctx: { params: { offerId: string } }) {
  const { offerId } = ctx.params;
  const url = new URL(req.url);

  const subId =
    url.searchParams.get("subid") ??
    url.searchParams.get("sub_id") ??
    undefined;

  const source = url.searchParams.get("source") ?? undefined;
  const userId = url.searchParams.get("user") ?? undefined;

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, hidden: false, status: "ACTIVE" },
    select: { id: true, targetUrl: true },
  });

  if (!offer || !offer.targetUrl) {
    return NextResponse.json({ error: "OFFER_NOT_AVAILABLE" }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const referer   = req.headers.get("referer")    ?? undefined;

  const clickUuid = randomUUID();

  await prisma.click.create({
    data: {
      offerId: offer.id,
      userId:  userId || undefined,
      subId:   subId  || undefined,
      ip,
      userAgent,
      referer,
      source:  source || undefined,
      clickId: clickUuid,
    },
  });

  // БЫЛО: просто добавляли/страховали click_id/offer_id/sub_id
  // СТАЛО: умная подстановка + плейсхолдеры
  let outUrl = applyClickPlaceholders(offer.targetUrl, {
    clickId: clickUuid,
    subId,
    userId,
  });

  // Доп.страховка: добавим offer_id и sub_id, если их нет (не мешает Favbet)
  try {
    const out = new URL(outUrl);
    if (!out.searchParams.has("offer_id")) out.searchParams.set("offer_id", offer.id);
    if (subId && !out.searchParams.has("sub_id")) out.searchParams.set("sub_id", subId);
    outUrl = out.toString();
  } catch {
    /* ignore */
  }

  return NextResponse.redirect(outUrl, { status: 302 });
}
