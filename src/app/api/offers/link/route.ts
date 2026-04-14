import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { offerId, subId, direct } = await req.json().catch(() => ({} as any));

  if (!offerId) {
    return NextResponse.json({ error: "NO_OFFER" }, { status: 400 });
  }

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, hidden: false, status: "ACTIVE" },
    select: {
      id: true,
      targetUrl: true,
      trackingTemplate: true,
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const fill = (tpl: string) =>
    tpl
      .replace(/{offerId}/g, offer.id)
      .replace(/{userId}/g, userId)
      .replace(/{subId}/g, encodeURIComponent(String(subId ?? "")));

  // direct link партнёрки / шаблона без нашего редиректа
  if (direct) {
    const base = offer.trackingTemplate || offer.targetUrl || "";
    if (!base) {
      return NextResponse.json(
        { error: "NO_TEMPLATE_OR_TARGET_URL" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, link: fill(base) });
  }

  // канонический redirect link через /r/[offerId]
  const reqUrl = new URL(req.url);
  const origin = process.env.APP_URL || reqUrl.origin;

  const params = new URLSearchParams({
    user: userId,
  });

  if (subId) {
    params.set("sub_id", String(subId));
  }

  const link = `${origin}/r/${offer.id}?${params.toString()}`;
  return NextResponse.json({ ok: true, link });
}