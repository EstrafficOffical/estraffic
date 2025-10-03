// src/app/api/offers/link/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { offerId, subId } = await req.json().catch(() => ({}));
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

  // 1) если есть trackingTemplate — подставляем плейсхолдеры
  if (offer.trackingTemplate) {
    const link = offer.trackingTemplate
      .replace("{offerId}", offer.id)
      .replace("{userId}", userId)
      .replace("{subId}", encodeURIComponent(String(subId ?? "")));
    return NextResponse.json({ link });
  }

  // 2) иначе — простой fallback на targetUrl + query
  const url = new URL(offer.targetUrl || "https://example.com/");
  if (subId) url.searchParams.set("subid", String(subId));
  url.searchParams.set("oid", offer.id);
  url.searchParams.set("uid", userId);
  return NextResponse.json({ link: url.toString() });
}
