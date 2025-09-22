// src/app/api/t/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

const norm = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s.length ? s : null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);

  const offerId = norm(url.searchParams.get("offer_id") ?? url.searchParams.get("offerId"));
  if (!offerId) {
    return NextResponse.json({ ok: false, error: "offer_id is required" }, { status: 400 });
  }

  // поддерживаем старые названия параметров на всякий случай
  const subIdParam = norm(
    url.searchParams.get("subId") ??
      url.searchParams.get("sub1") ??
      url.searchParams.get("s1")
  );

  // попробуем связать клик с пользователем
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = (session?.user as any)?.id ?? null;
  } catch {
    // игнорируем — гость
  }

  // создаём клик
  let clickId: string | undefined;
  try {
    const created = await prisma.click.create({
      data: {
        offerId,
        userId,
        subId: subIdParam ?? undefined,
        // Если в модели Click у тебя всё ещё есть колонка sub1 и ты хочешь её дублировать, добавь:
    
        // sub1: subIdParam ?? undefined,
      } as any,
      select: { id: true },
    });
    clickId = created.id;
  } catch (e) {
    console.error("[/api/t] click create error:", e);
  }

  // найдём целевой URL оффера
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { targetUrl: true },
  });

  // запасной вариант — корень сайта
  let target = offer?.targetUrl || "/";

  // простая подстановка плейсхолдеров
  if (clickId) target = target.replace(/\{click_id\}/gi, clickId);
  if (subIdParam) {
    target = target.replace(/\{subId\}/gi, subIdParam).replace(/\{sub1\}/gi, subIdParam);
  }
  if (userId) target = target.replace(/\{user_id\}/gi, String(userId));

  // всегда делаем абсолютный URL относительно текущего хоста
  const redirectTo = new URL(target, url.origin);
  return NextResponse.redirect(redirectTo, { status: 302 });
}
