import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ ok: false }, { status: 403 });

  const req = await prisma.offerRequest.update({
    where: { id: params.id },
    data: { status: "APPROVED", processedAt: new Date() },
  });

  await prisma.userOffer.upsert({
    where: { userId_offerId: { userId: req.userId, offerId: req.offerId }},
    create: { userId: req.userId, offerId: req.offerId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
