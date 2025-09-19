// src/app/api/t/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { clickQuerySchema } from "@/lib/validation";
import { ipFromRequest, rateLimit } from "@/lib/rate-limit";
import { auth } from "@/lib/auth";

function appendParam(urlStr: string, key: string, value: string) {
  const url = new URL(urlStr);
  url.searchParams.set(key, value);
  return url.toString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // --- Rate limit (по IP+route), 30 кликов за 60 секунд
  const ip = ipFromRequest(req);
  const rl = rateLimit(`t:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  // --- Валидация входа
  const parsed = clickQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { offer_id, click_id, sub1, sub2, sub3, sub4, sub5 } = parsed.data;

  // --- Найдём оффер + targetUrl
  const offer = await prisma.offer.findUnique({
    where: { id: offer_id },
    select: { id: true, title: true, targetUrl: true },
  });

  if (!offer || !offer.targetUrl) {
    return NextResponse.json({ error: "Offer not found" }, { status: 404 });
  }

  // --- Сессия (юзер может быть не залогинен)
  const session = await auth().catch(() => null);
  const userId = (session?.user as any)?.id ?? null;

  // --- Генерация clickId (если не пришёл от трекера)
  const cid = click_id && click_id.trim() ? click_id.trim() : crypto.randomUUID();

  // --- Пишем клик
  try {
    await prisma.click.create({
      data: {
        offerId: offer.id,
        userId,
        clickId: cid,
        ip,
        ua: req.headers.get("user-agent") || null,
        sub1: sub1 || null,
        sub2: sub2 || null,
        sub3: sub3 || null,
        sub4: sub4 || null,
        sub5: sub5 || null,
      } as any,
    });
  } catch (e) {
    // не валим редирект из-за аналитики
    console.error("click insert failed", e);
  }

  // --- Редиректим на целевой URL, прокидывая click_id
  const target = appendParam(offer.targetUrl, "click_id", cid);
  return NextResponse.redirect(target, { status: 302 });
}
