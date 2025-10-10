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

  const body = await req.json().catch(() => ({}));
  const { offerId } = body || {};
  if (!offerId) return bad("MISSING offerId");

  const allow = [
    "title","tag","geo","vertical","mode","status","hidden",
    "targetUrl","cpa","cap","kpi1Text","kpi2Text","kpi1","kpi2",
  ] as const;

  const data: any = {};
  for (const k of allow) {
    if (body[k] === undefined) continue;

    switch (k) {
      case "cpa":
        data.cpa = body.cpa === "" || body.cpa == null ? null : Number(body.cpa);
        if (data.cpa != null && !Number.isFinite(data.cpa)) return bad("INVALID cpa");
        break;
      case "cap":
        data.cap = body.cap === "" || body.cap == null ? null : Number.parseInt(String(body.cap), 10);
        if (data.cap != null && (!Number.isFinite(data.cap) || data.cap < 0)) return bad("INVALID cap");
        break;
      case "hidden":
        data.hidden = !!body.hidden;
        break;
      case "mode":
        data.mode = body.mode === "Auto" ? "Auto" : "Manual";
        break;
      case "status":
        data.status = ["ACTIVE","ARCHIVED","PAUSED"].includes(body.status) ? body.status : "ACTIVE";
        break;
      case "kpi1":
      case "kpi2":
        data[k] = body[k] === "" || body[k] == null ? null : Number(body[k]);
        if (data[k] != null && !Number.isFinite(data[k])) return bad(`INVALID ${k}`);
        break;
      default:
        data[k] = body[k] === "" ? null : String(body[k]).trim();
    }
  }

  const upd = await prisma.offer.update({
    where: { id: offerId },
    data,
    select: {
      id: true, title: true, tag: true, geo: true, vertical: true, mode: true,
      cpa: true, cap: true, kpi1Text: true, kpi2Text: true, kpi1: true, kpi2: true,
      status: true, hidden: true, targetUrl: true, updatedAt: true
    },
  });

  return NextResponse.json({
    ok: true,
    offer: { ...upd, cpa: upd.cpa != null ? Number(upd.cpa) : null }
  });
}
