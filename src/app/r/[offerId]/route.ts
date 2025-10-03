// src/app/r/[offerId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /r/:offerId?sub_id=&user=&source=&click_id=...
export async function GET(
  req: Request,
  ctx: { params: { offerId: string } }
) {
  const { offerId } = ctx.params;
  const url = new URL(req.url);

  // забираем параметры клика
  const subId = url.searchParams.get("sub_id") || undefined;
  const userId = url.searchParams.get("user") || undefined;
  const source = url.searchParams.get("source") || undefined;
  const clickId = url.searchParams.get("click_id") || undefined;

  // находим оффер (скрытые не отдаем)
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, hidden: false },
    select: { id: true, targetUrl: true, title: true },
  });
  if (!offer || !offer.targetUrl) {
    return NextResponse.json({ error: "OFFER_NOT_FOUND" }, { status: 404 });
  }

  // базовая информация по устройству для лога
  const ua = (req.headers.get("user-agent") || "").slice(0, 400);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  // пишем клик
  const created = await prisma.click.create({
    data: {
      offerId: offer.id,
      userId,
      subId,
      userAgent: ua || null,
      ip: ip || null,
      source: source || null,
      clickId: clickId || null,
    },
    select: { id: true },
  });

  // редиректим на целевой URL, можно протащить click_id партнёру
  const out = new URL(offer.targetUrl);
  // не переопределяем чужие query, аккуратно дописываем
  if (!out.searchParams.has("click_id")) {
    out.searchParams.set("click_id", created.id);
  }
  if (subId && !out.searchParams.has("sub_id")) {
    out.searchParams.set("sub_id", subId);
  }

  return NextResponse.redirect(out.toString(), { status: 302 });
}
