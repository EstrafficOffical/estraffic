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

  // оффер должен существовать и быть не скрытым
  const offer = await prisma.offer.findUnique({
    where: { id: offerId, hidden: false },
    select: { id: true, targetUrl: true },
  } as any);

  if (!offer || !offer.targetUrl) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // строим абсолютный URL на наш редирект: https://<host>/r/:offerId?...
  const host =
    process.env.APP_URL || // предпочтительно укажи APP_URL в Vercel env (например, https://www.estraffic.com)
    (req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "").replace(/\/+$/, "");
  const proto =
    process.env.APP_URL?.startsWith("http") ||
    (req.headers.get("x-forwarded-proto") || "https");

  const base = `https://${host}`;
  const params = new URLSearchParams();
  if (subId) params.set("sub_id", String(subId));
  if (userId) params.set("user", String(userId));

  const link = `${base}/r/${offer.id}${params.toString() ? "?" + params.toString() : ""}`;
  return NextResponse.json({ link });
}
