import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(_: Request, { params }: { params: { id: string }}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const offer = await prisma.offer.findUnique({ where: { id: params.id }});
  if (!offer) return NextResponse.json({ ok: false, error: "offer_not_found" }, { status: 404 });

  await prisma.offerRequest.upsert({
    where: { userId_offerId: { userId, offerId: offer.id } },
    create: { userId, offerId: offer.id, status: "REQUESTED" },
    update: { status: "REQUESTED" },
  });

  return NextResponse.json({ ok: true });
}
