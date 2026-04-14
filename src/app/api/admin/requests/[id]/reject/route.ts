import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const role = (session as any)?.user?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = params.id;

  const request = await prisma.offerRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, offerId: true, status: true },
  });

  if (!request) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.offerRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
      },
    });

    await tx.offerAccess.updateMany({
      where: {
        userId: request.userId,
        offerId: request.offerId,
      },
      data: {
        approved: false,
      },
    });
  });

  return NextResponse.json({ ok: true });
}