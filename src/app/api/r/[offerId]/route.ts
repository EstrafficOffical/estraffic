// src/app/api/r/[offerId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

// GET /r/:offerId?subid=&sub_id=&source=&user=
export async function GET(req: Request, ctx: { params: { offerId: string } }) {
  const { offerId } = ctx.params;
  const url = new URL(req.url);

  // subId: поддерживаем оба варианта имени
  const subId =
    url.searchParams.get("subid") ??
    url.searchParams.get("sub_id") ??
    undefined;

  const source = url.searchParams.get("source") ?? undefined;
  const userId = url.searchParams.get("user") ?? undefined;

  // оффер должен быть активным и не скрытым
  const offer = await prisma.offer.findFirst({
    where: { id: offerId, hidden: false, status: "ACTIVE" },
    select: { id: true, targetUrl: true },
  });

  if (!offer || !offer.targetUrl) {
    return NextResponse.json({ error: "OFFER_NOT_AVAILABLE" }, { status: 404 });
  }

  // собираем best-effort окружение
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined;
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const referer = req.headers.get("referer") ?? undefined;

  // генерируем click_id (uuid) и сохраняем в Click.clickId
  const clickUuid = randomUUID();

  await prisma.click.create({
    data: {
      offerId: offer.id,
      userId: userId || undefined,
      subId: subId || undefined,
      ip,
      userAgent,
      referer,
      source: source || undefined,
      clickId: clickUuid,
    },
  });

  // аккуратно дописываем параметры к targetUrl
  const out = new URL(offer.targetUrl);
  if (!out.searchParams.has("click_id")) out.searchParams.set("click_id", clickUuid);
  if (!out.searchParams.has("offer_id")) out.searchParams.set("offer_id", offer.id);
  if (subId && !out.searchParams.has("sub_id")) out.searchParams.set("sub_id", subId);

  return NextResponse.redirect(out.toString(), { status: 302 });
}
