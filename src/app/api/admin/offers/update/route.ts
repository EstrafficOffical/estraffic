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
  const { offerId, cpa, cap } = body || {};
  if (!offerId) return bad("MISSING offerId");

  const data: any = {};

  if (cpa !== undefined && cpa !== null && cpa !== "") {
    const n = Number(cpa);
    if (!Number.isFinite(n)) return bad("INVALID cpa");
    data.cpa = n;
  }

  if (cap !== undefined) {
    if (cap === null || cap === "") {
      data.cap = null;
    } else {
      const n = parseInt(String(cap), 10);
      if (!Number.isFinite(n) || n < 0) return bad("INVALID cap");
      data.cap = n;
    }
  }

  const upd = await prisma.offer.update({
    where: { id: offerId },
    data,
    select: { id: true, title: true, cpa: true, cap: true },
  });

  return NextResponse.json({ ok: true, offer: upd });
}
