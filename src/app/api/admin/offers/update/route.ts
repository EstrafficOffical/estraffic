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
    cpa,
    cap,
    kpi1Text,
    kpi2Text,
    mode,        // "Auto" | "Manual"
    targetUrl,
    status,      // "ACTIVE" | "ARCHIVED" | "PAUSED"
    hidden,      // boolean
  } = body || {};

  if (!offerId) return bad("MISSING offerId");

  const data: any = {};

  if (title !== undefined) data.title = String(title).trim();
  if (tag !== undefined) data.tag = tag === null ? null : String(tag).trim();
  if (geo !== undefined) data.geo = String(geo).trim();
  if (vertical !== undefined) data.vertical = String(vertical).trim();

  if (cpa !== undefined) {
    if (cpa === null || cpa === "") data.cpa = null;
    else {
      const n = Number(cpa);
      if (!Number.isFinite(n)) return bad("INVALID cpa");
      data.cpa = n;
    }
  }

  if (cap !== undefined) {
    if (cap === null || cap === "") data.cap = null;
    else {
      const n = parseInt(String(cap), 10);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID cap");
      data.cap = n;
    }
  }

  if (kpi1Text !== undefined) data.kpi1Text = kpi1Text === null ? null : String(kpi1Text);
  if (kpi2Text !== undefined) data.kpi2Text = kpi2Text === null ? null : String(kpi2Text);

  if (mode !== undefined) {
    if (mode !== "Auto" && mode !== "Manual") return bad("INVALID mode");
    data.mode = mode;
  }

  if (targetUrl !== undefined) data.targetUrl = targetUrl === null ? null : String(targetUrl);

  if (status !== undefined) {
    if (!["ACTIVE", "ARCHIVED", "PAUSED"].includes(status)) return bad("INVALID status");
    data.status = status;
  }

  if (hidden !== undefined) data.hidden = !!hidden;

  const upd = await prisma.offer.update({
    where: { id: offerId },
    data,
    select: {
      id: true, title: true, tag: true, geo: true, vertical: true,
      cpa: true, cap: true, kpi1Text: true, kpi2Text: true, mode: true,
      targetUrl: true, status: true, hidden: true, updatedAt: true
    },
  });

  return NextResponse.json({ ok: true, offer: upd });
}
