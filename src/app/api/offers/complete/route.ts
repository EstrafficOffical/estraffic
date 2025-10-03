// src/app/api/offers/complete/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const { offerId } = await req.json().catch(() => ({}));
  if (!offerId) {
    return NextResponse.json({ error: "NO_OFFER" }, { status: 400 });
  }

  // переводим все одобренные записи по этому офферу для юзера в completed
  await prisma.offerRequest.updateMany({
    where: { userId, offerId, status: "APPROVED", completedAt: null },
    data: { completedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
