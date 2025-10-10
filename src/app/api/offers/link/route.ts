import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/offers/link?offerId=...&subid=...
 * Возвращает готовую трекинг-ссылку вида:
 *   { link: "https://<base>/r/<offerId>?user=<uid>&subid=<subid>" }
 *
 * Требует авторизации и одобренного доступа к офферу.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const url = new URL(req.url);
  const offerId = url.searchParams.get("offerId") || url.searchParams.get("id");
  const subid = url.searchParams.get("subid") || url.searchParams.get("subId") || "";

  if (!offerId) {
    return NextResponse.json({ error: "MISSING offerId" }, { status: 400 });
  }

  // проверим, что оффер существует и не скрыт
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { id: true, hidden: true, status: true },
  });
  if (!offer || offer.hidden || offer.status !== "ACTIVE") {
    return NextResponse.json({ error: "OFFER_NOT_AVAILABLE" }, { status: 404 });
  }

  // проверка доступа: должен быть approved в OfferAccess
  const access = await prisma.offerAccess.findFirst({
    where: { offerId, userId, approved: true },
    select: { id: true },
  });
  if (!access) {
    return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
  }

  // базовый хост для ссылки
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const linkUrl = new URL(`/r/${offerId}`, base);
  linkUrl.searchParams.set("user", userId);
  if (subid) linkUrl.searchParams.set("subid", subid);

  return NextResponse.json({ link: linkUrl.toString() });
}

/**
 * POST /api/offers/link
 * Body: { offerId: string, subid?: string }
 * Аналогично GET, но через JSON body.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const offerId = body.offerId as string | undefined;
  const subid = (body.subid ?? body.subId ?? "") as string;

  if (!offerId) {
    return NextResponse.json({ error: "MISSING offerId" }, { status: 400 });
  }

  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    select: { id: true, hidden: true, status: true },
  });
  if (!offer || offer.hidden || offer.status !== "ACTIVE") {
    return NextResponse.json({ error: "OFFER_NOT_AVAILABLE" }, { status: 404 });
  }

  const access = await prisma.offerAccess.findFirst({
    where: { offerId, userId, approved: true },
    select: { id: true },
  });
  if (!access) {
    return NextResponse.json({ error: "ACCESS_DENIED" }, { status: 403 });
  }

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";

  const linkUrl = new URL(`/r/${offerId}`, base);
  linkUrl.searchParams.set("user", userId);
  if (subid) linkUrl.searchParams.set("subid", subid);

  return NextResponse.json({ link: linkUrl.toString() });
}
