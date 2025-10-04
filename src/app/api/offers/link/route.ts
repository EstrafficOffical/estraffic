import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { offerId, subId, direct } = await req.json().catch(() => ({}));
  if (!offerId) {
    return NextResponse.json({ error: "NO_OFFER" }, { status: 400 });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId, hidden: false },
    select: { id: true, targetUrl: true, trackingTemplate: true },
  });
  if (!offer) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Утилита для подстановки плейсхолдеров
  const fill = (tpl: string) =>
    tpl
      .replace(/{offerId}/g, offer.id)
      .replace(/{userId}/g, userId)
      .replace(/{subId}/g, encodeURIComponent(String(subId ?? "")));

  // DIRECT: отдать «сырую» ссылку от партнёра/шаблон без нашего редиректа
  if (direct) {
    const base = offer.trackingTemplate || offer.targetUrl || "";
    if (!base) {
      return NextResponse.json(
        { error: "NO_TEMPLATE_OR_TARGET_URL" },
        { status: 400 }
      );
    }
    return NextResponse.json({ link: fill(base) });
  }

  // REDIRECT (рекомендуется): считаем клик и 302 на target
  const origin =
    process.env.APP_URL ||
    (typeof window === "undefined"
      ? "https://your-domain.tld"
      : window.location.origin);

  const params = new URLSearchParams({
    user: userId,
  });
  if (subId) params.set("sub_id", String(subId));

  const link = `${origin}/r/${offer.id}?${params.toString()}`;
  return NextResponse.json({ link });
}
