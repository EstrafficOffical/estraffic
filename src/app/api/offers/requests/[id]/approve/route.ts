// src/app/api/offers/requests/[id]/approve/route.ts
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
  const reqRow = await prisma.offerRequest.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  await prisma.offerAccess.upsert({
    where: { userId_offerId: { userId: reqRow.userId, offerId: reqRow.offerId } },
    update: { approved: true },
    create: { userId: reqRow.userId, offerId: reqRow.offerId, approved: true },
  });

  return NextResponse.json({ ok: true });
}
