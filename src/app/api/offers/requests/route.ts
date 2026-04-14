import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const body = (await req.json().catch(() => null)) as
    | { offerId?: string; message?: string }
    | null;

  const offerId = body?.offerId;
  if (!offerId) {
    return NextResponse.json({ error: "offerId is required" }, { status: 400 });
  }

  // текущий доступ
  const access = await prisma.offerAccess.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });

  // если доступ активен — оффер уже в работе
  if (access?.approved) {
    return NextResponse.json({ ok: true, status: "IN_PROGRESS" });
  }

  // последняя заявка по этому офферу
  const existing = await prisma.offerRequest.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });

  // 1) заявка уже висит в ожидании
  if (existing?.status === "PENDING") {
    return NextResponse.json({ ok: true, status: "REQUESTED", id: existing.id });
  }

  // 2) старая заявка была REJECTED
  // 3) старая заявка была APPROVED, но доступ уже снят
  // 4) заявка была завершена completedAt
  // => переоткрываем в PENDING
  if (existing) {
    const reopened = await prisma.offerRequest.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        message: body?.message ?? existing.message ?? null,
        processedAt: null,
        completedAt: null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, status: "REQUESTED", id: reopened.id, reopened: true });
  }

  // 5) если заявки не было — создаём новую
  const created = await prisma.offerRequest.create({
    data: {
      userId,
      offerId,
      message: body?.message ?? null,
      status: "PENDING",
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, status: "REQUESTED", id: created.id });
}