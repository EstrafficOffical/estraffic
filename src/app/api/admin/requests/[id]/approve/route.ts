import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  // 1) апрувим запрос
  const reqRow = await prisma.offerRequest.update({
    where: { id: params.id },
    data: { status: "APPROVED" }, // processedAt убрали, т.к. его нет в схеме
    select: { userId: true, offerId: true },
  });

  // 2) выдаём доступ к офферу
  await prisma.offerAccess.upsert({
    where: { userId_offerId: { userId: reqRow.userId, offerId: reqRow.offerId } },
    create: { userId: reqRow.userId, offerId: reqRow.offerId, approved: true },
    update: { approved: true },
  });

  return NextResponse.json({ ok: true });
}
