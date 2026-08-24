import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function POST(req: Request) {
  const { res } = await requireAdminStepUp();
  if (res) return res;

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
    const value = String(title).trim();
    if (!value) return bad("INVALID_TITLE");
    data.title = value;
  }

  if (tag !== undefined) {
    data.tag = tag ? String(tag).trim() : null;
  }

  if (geo !== undefined) {
    const value = String(geo).trim();
    if (!value) return bad("INVALID_GEO");
    data.geo = value;
  }

  if (vertical !== undefined) {
    const value = String(vertical).trim();
    if (!value) return bad("INVALID_VERTICAL");
    data.vertical = value;
  }

  if (tier !== undefined) {
    const value = Number(tier);
    if (![1, 2, 3].includes(value)) return bad("INVALID_TIER");
    data.tier = value;
  }

  if (cpa !== undefined) {
    if (cpa === null || cpa === "") {
      data.cpa = null;
    } else {
      const value = Number(cpa);
      if (!Number.isFinite(value) || value < 0) return bad("INVALID_CPA");
      data.cpa = value;
    }
  }

  if (cap !== undefined) {
    if (cap === null || cap === "") {
      data.cap = null;
    } else {
      const value = parseInt(String(cap), 10);
      if (!Number.isFinite(value) || value < 0) return bad("INVALID_CAP");
      data.cap = value;
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
      const value = Number(minDeposit);
      if (!Number.isFinite(value) || value < 0) {
        return bad("INVALID_MIN_DEPOSIT");
      }
      data.minDeposit = value;
    }
  }

  if (holdDays !== undefined) {
    if (holdDays === null || holdDays === "") {
      data.holdDays = null;
    } else {
      const value = parseInt(String(holdDays), 10);
      if (!Number.isFinite(value) || value < 0) {
        return bad("INVALID_HOLD_DAYS");
      }
      data.holdDays = value;
    }
  }

  if (kpi1Text !== undefined) {
    data.kpi1Text = kpi1Text ? String(kpi1Text).trim() : null;
  }
  if (kpi2Text !== undefined) {
    data.kpi2Text = kpi2Text ? String(kpi2Text).trim() : null;
  }
  if (rules !== undefined) {
    data.rules = rules ? String(rules).trim() : null;
  }
  if (notes !== undefined) {
    data.notes = notes ? String(notes).trim() : null;
  }
  if (targetUrl !== undefined) {
    data.targetUrl = targetUrl ? String(targetUrl).trim() : null;
  }
  if (trackingTemplate !== undefined) {
    data.trackingTemplate = trackingTemplate
      ? String(trackingTemplate).trim()
      : null;
  }

  const updated = await prisma.offer.update({
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
      kpi1Text: true,
      kpi2Text: true,
      rules: true,
      notes: true,
      targetUrl: true,
      trackingTemplate: true,
    },
  });

  return NextResponse.json({
    ok: true,
    offer: {
      ...updated,
      cpa: updated.cpa != null ? Number(updated.cpa) : null,
      minDeposit:
        updated.minDeposit != null ? Number(updated.minDeposit) : null,
    },
  });
}