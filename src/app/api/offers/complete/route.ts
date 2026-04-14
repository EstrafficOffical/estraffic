import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { offerId } = await req.json().catch(() => ({} as { offerId?: string }));

  if (!offerId) {
    return NextResponse.json({ error: "NO_OFFER" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.offerRequest.updateMany({
      where: {
        userId,
        offerId,
        status: "APPROVED",
        completedAt: null,
      },
      data: {
        completedAt: new Date(),
      },
    });

    await tx.offerAccess.updateMany({
      where: {
        userId,
        offerId,
        approved: true,
      },
      data: {
        approved: false,
      },
    });
  });

  return NextResponse.json({ ok: true });
}