import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function getClientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return undefined;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const offerId = (url.searchParams.get("offerId") || "").trim();
    if (!offerId) {
      return NextResponse.json({ ok: false, error: "missing offerId" }, { status: 400 });
    }

    const offer = await prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) {
      return NextResponse.json({ ok: false, error: "offer not found", offerId }, { status: 404 });
    }

    const subId    = (url.searchParams.get("subid") || "").trim() || undefined;
    const source   = (url.searchParams.get("source") || "").trim() || undefined;
    const sub1     = (url.searchParams.get("sub1") || "").trim() || undefined;
    const sub2     = (url.searchParams.get("sub2") || "").trim() || undefined;
    const sub3     = (url.searchParams.get("sub3") || "").trim() || undefined;
    const sub4     = (url.searchParams.get("sub4") || "").trim() || undefined;
    const sub5     = (url.searchParams.get("sub5") || "").trim() || undefined;

    const campaign = (url.searchParams.get("campaign") || "").trim() || undefined;
    const adset    = (url.searchParams.get("adset") || "").trim() || undefined;
    const creative = (url.searchParams.get("creative") || "").trim() || undefined;
    const clickId  = (url.searchParams.get("clickId") || "").trim() || undefined;

    const ip        = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? undefined;
    const referer   = req.headers.get("referer") ?? undefined;

    await prisma.click.create({
      data: {
        offerId, subId, ip, userAgent, referer, source,
        sub1, sub2, sub3, sub4, sub5, campaign, adset, creative, clickId,
      },
    });

    // Пока редиректим на главную. Если добавишь поле offer.targetUrl — подставь его.
    return NextResponse.redirect(new URL("/", url.origin));
  } catch (e: any) {
    console.error("[/api/t] error:", e);
    return NextResponse.json(
      { ok: false, error: "internal", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
