import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function POST(req: Request) {
  const { res } = await requireAdminStepUp();
  if (res) return res;

  const body = await req.json().catch(() => ({} as any));
  const { offerId, hidden } = body || {};

  if (!offerId || typeof hidden !== "boolean") {
    return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });
  }

  const offer = await prisma.offer.update({
    where: { id: offerId },
    data: { hidden },
    select: { id: true, hidden: true },
  });

  return NextResponse.json({ ok: true, offer });
}