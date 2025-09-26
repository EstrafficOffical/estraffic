// src/app/api/offers/requests/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { res } = await requireAdmin();
  if (res) return res;

  const id = params.id;

  try {
    const reqRow = await prisma.offerRequest.update({
      where: { id },
      data: {
        // ✔ используем строковые значения enum'а
        status: "APPROVED",
        processedAt: new Date(),
      },
      select: { id: true, userId: true, offerId: true },
    });

    // Выдаём доступ (или обновляем, если уже есть)
    await prisma.offerAccess.upsert({
      where: { userId_offerId: { userId: reqRow.userId, offerId: reqRow.offerId } },
      update: { approved: true },
      create: { userId: reqRow.userId, offerId: reqRow.offerId, approved: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    console.error("approve request error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
