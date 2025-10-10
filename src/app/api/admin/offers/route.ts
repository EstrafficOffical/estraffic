import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const b = await req.json().catch(() => ({}));
  const data: any = {
    title: String(b.title ?? "").trim(),
    tag: b.tag ? String(b.tag).trim() : null,
    geo: String(b.geo ?? "").trim(),
    vertical: String(b.vertical ?? "").trim(),
    cpa: b.cpa == null || b.cpa === "" ? null : Number(b.cpa),
    cap: b.cap == null || b.cap === "" ? null : Number(b.cap),
    kpi1Text: b.kpi1Text ? String(b.kpi1Text).trim() : null,
    kpi2Text: b.kpi2Text ? String(b.kpi2Text).trim() : null,
    mode: b.mode === "Auto" ? "Auto" : "Manual",
    targetUrl: b.targetUrl ? String(b.targetUrl).trim() : null,
  };

  if (!data.title || !data.geo || !data.vertical) {
    return NextResponse.json({ error: "MISSING FIELDS" }, { status: 400 });
  }

  const created = await prisma.offer.create({ data });
  return NextResponse.json({ ok: true, id: created.id });
}
