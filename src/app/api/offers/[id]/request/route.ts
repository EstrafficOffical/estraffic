import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireApproved } from "@/lib/api-guards";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { session, res } = await requireApproved();
  if (res) return res;

  const userId = (session!.user as any).id as string;
  const offerId = params.id;

  const request = await prisma.offerRequest.upsert({
    where: { userId_offerId: { userId, offerId } },
    update: { status: "PENDING" },
    create: { userId, offerId, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, request });
}
