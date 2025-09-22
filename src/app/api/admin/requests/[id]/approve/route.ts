import { NextResponse } from "next/server";
import  { auth }  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = (session as any)?.user?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = params.id;

  // Ищем заявку
  const request = await prisma.offerRequest.findUnique({
    where: { id },
    select: { id: true, userId: true, offerId: true, status: true },
  });

  if (!request) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  // Уже одобрена — просто подтверждаем
  if (request.status === "APPROVED") {
    return NextResponse.json({ ok: true, already: true });
  }

  // Транзакция: ставим APPROVED и выдаём доступ
  await prisma.$transaction(async (tx) => {
    await tx.offerRequest.update({
      where: { id },
      data: { status: "APPROVED", processedAt: new Date() },
    });

    await tx.offerAccess.upsert({
      where: {
        userId_offerId: { userId: request.userId, offerId: request.offerId },
      },
      update: { approved: true },
      create: {
        userId: request.userId,
        offerId: request.offerId,
        approved: true,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
