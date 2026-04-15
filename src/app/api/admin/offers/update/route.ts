// src/app/api/admin/offers/update/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return bad("UNAUTHORIZED", 401);
  }

  const body = await req.json().catch(() => ({} as any));
  const {
    offerId,
    title,
    tag,
    geo,
    vertical,
    tier,
    cpa,
    cap,
    mode,
    minDeposit,
    holdDays,
    kpi1Text,
    kpi2Text,
    rules,
    notes,
    targetUrl,
    trackingTemplate,
  } = body || {};

  if (!offerId) return bad("MISSING offerId");

  const data: any = {};

  if (title !== undefined) {
    const v = String(title).trim();
    if (!v) return bad("INVALID_TITLE");
    data.title = v;
  }

  if (tag !== undefined) {
    data.tag = tag ? String(tag).trim() : null;
  }

  if (geo !== undefined) {
    const v = String(geo).trim();
    if (!v) return bad("INVALID_GEO");
    data.geo = v;
  }

  if (vertical !== undefined) {
    const v = String(vertical).trim();
    if (!v) return bad("INVALID_VERTICAL");
    data.vertical = v;
  }

  if (tier !== undefined) {
    const n = Number(tier);
    if (![1, 2, 3].includes(n)) return bad("INVALID_TIER");
    data.tier = n;
  }

  if (cpa !== undefined) {
    if (cpa === null || cpa === "") {
      data.cpa = null;
    } else {
      const n = Number(cpa);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID_CPA");
      data.cpa = n;
    }
  }

  if (cap !== undefined) {
    if (cap === null || cap === "") {
      data.cap = null;
    } else {
      const n = parseInt(String(cap), 10);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID_CAP");
      data.cap = n;
    }
  }

  if (mode !== undefined) {
    if (!["Auto", "Manual"].includes(String(mode))) return bad("INVALID_MODE");
    data.mode = mode;
  }

  if (minDeposit !== undefined) {
    if (minDeposit === null || minDeposit === "") {
      data.minDeposit = null;
    } else {
      const n = Number(minDeposit);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID_MIN_DEPOSIT");
      data.minDeposit = n;
    }
  }

  if (holdDays !== undefined) {
    if (holdDays === null || holdDays === "") {
      data.holdDays = null;
    } else {
      const n = parseInt(String(holdDays), 10);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID_HOLD_DAYS");
      data.holdDays = n;
    }
  }

  if (kpi1Text !== undefined) data.kpi1Text = kpi1Text ? String(kpi1Text).trim() : null;
  if (kpi2Text !== undefined) data.kpi2Text = kpi2Text ? String(kpi2Text).trim() : null;
  if (rules !== undefined) data.rules = rules ? String(rules).trim() : null;
  if (notes !== undefined) data.notes = notes ? String(notes).trim() : null;
  if (targetUrl !== undefined) data.targetUrl = targetUrl ? String(targetUrl).trim() : null;
  if (trackingTemplate !== undefined) data.trackingTemplate = trackingTemplate ? String(trackingTemplate).trim() : null;

  const upd = await prisma.offer.update({
    where: { id: offerId },
    data,
    select: {
      id: true,
      title: true,
      tag: true,
      geo: true,
      vertical: true,
      tier: true,
      cpa: true,
      cap: true,
      mode: true,
      minDeposit: true,
      holdDays: true,
      hidden: true,
    },
  });

  return NextResponse.json({
    ok: true,
    offer: {
      ...upd,
      cpa: upd.cpa != null ? Number(upd.cpa) : null,
      minDeposit: upd.minDeposit != null ? Number(upd.minDeposit) : null,
    },
  });
}