// src/app/api/admin/offers/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const {
    title, tag, geo, vertical,
    cpa, mode, targetUrl, cap,
    kpi1Text, kpi2Text, // текстовые KPI
  } = body || {};

  if (!title || !geo || !vertical || !mode) {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const data: any = {
    title: String(title),
    tag: tag ?? null,
    geo: String(geo),
    vertical: String(vertical),
    mode,
    targetUrl: targetUrl ?? null,
  };

  if (cpa !== undefined && cpa !== null && cpa !== "") {
    const n = Number(cpa);
    if (!Number.isFinite(n)) return NextResponse.json({ error: "INVALID_CPA" }, { status: 400 });
    data.cpa = n;
  }
  if (cap !== undefined && cap !== null && cap !== "") {
    const n = parseInt(String(cap), 10);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "INVALID_CAP" }, { status: 400 });
    data.cap = n;
  }

  // текстовые KPI — сохраняем как есть
  if (kpi1Text !== undefined) data.kpi1Text = kpi1Text || null;
  if (kpi2Text !== undefined) data.kpi2Text = kpi2Text || null;

  const created = await prisma.offer.create({ data, select: { id: true } });
  return NextResponse.json({ ok: true, id: created.id });
}
