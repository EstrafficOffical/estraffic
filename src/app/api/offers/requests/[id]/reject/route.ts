// src/app/api/offers/requests/[id]/reject/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-guards";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { res } = await requireAdmin();
  if (res) return res;

  const id = params.id;

  await prisma.offerRequest.update({
  where: { id },
  data: { status: "REJECTED", processedAt: new Date() },
});

  // доступ (OfferAccess) не даём
  return NextResponse.json({ ok: true });
}
