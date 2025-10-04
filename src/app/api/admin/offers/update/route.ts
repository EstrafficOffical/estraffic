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

  const body = await req.json().catch(() => ({}));
  const { offerId, cpa, capDaily, capMonthly } = body || {};
  if (!offerId) return bad("MISSING offerId");

  const data: any = {};
  if (cpa != null) data.cpa = Number(cpa);
  if (capDaily != null) data.capDaily = parseInt(String(capDaily));
  if (capMonthly != null) data.capMonthly = parseInt(String(capMonthly));

  const upd = await prisma.offer.update({
    where: { id: offerId },
    data,
    select: { id: true, title: true, cpa: true, capDaily: true, capMonthly: true },
  });

  return NextResponse.json({ ok: true, offer: upd });
}
