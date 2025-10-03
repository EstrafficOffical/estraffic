// src/app/api/admin/offers/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Body = {
  title: string;
  tag?: string | null;
  geo: string;
  vertical: string;
  cpa?: number | null;
  kpi1?: number | null;
  kpi2?: number | null;
  mode: "Auto" | "Manual";
  targetUrl?: string | null;
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (!session?.user || role !== "ADMIN") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    if (!body?.title?.trim()) return NextResponse.json({ error: "TITLE_REQUIRED" }, { status: 400 });
    if (!body?.geo?.trim()) return NextResponse.json({ error: "GEO_REQUIRED" }, { status: 400 });
    if (!body?.vertical?.trim()) return NextResponse.json({ error: "VERTICAL_REQUIRED" }, { status: 400 });
    if (body.mode !== "Auto" && body.mode !== "Manual") {
      return NextResponse.json({ error: "MODE_INVALID" }, { status: 400 });
    }

    const data: any = {
      title: body.title.trim(),
      tag: body.tag?.trim() || null,
      geo: body.geo.trim(),
      vertical: body.vertical.trim(),
      cpa: body.cpa ?? null,
      kpi1: body.kpi1 ?? null,
      kpi2: body.kpi2 ?? null,
      mode: body.mode,
      status: "ACTIVE",
      targetUrl: body.targetUrl?.trim() || null,
      hidden: false,
    };

    try {
      data.trackingTemplate = data.targetUrl
        ? `${data.targetUrl}${data.targetUrl.includes("?") ? "&" : "?"}offer={offerId}&sub_id={subId}&user={userId}`
        : null;
    } catch {}

    const created = await prisma.offer.create({ data });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err: any) {
    console.error("Create offer error:", err);
    return NextResponse.json({ error: err?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}
