import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // Берём последние 50 конверсий вместе с пользователем и оффером
  const items = await prisma.conversion.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      subId: true,
      amount: true,     // Decimal | null
      currency: true,
      type: true,
      txId: true,
      user: { select: { id: true, email: true, name: true } },
      offer: { select: { id: true, title: true } }, // <-- теперь title
    },
  });

  // Приводим Decimal/Date к числам/строкам и делаем безопасный ответ
  const safe = items.map((c) => ({
    id: c.id,
    createdAt: c.createdAt.toISOString(),
    user: c.user
      ? { id: c.user.id, email: c.user.email ?? null, name: c.user.name ?? null }
      : null,
    offer: c.offer ? { id: c.offer.id, title: c.offer.title } : null,
    subId: c.subId ?? null,                              // тут обычно click_id/subid
    amount: c.amount != null ? Number(c.amount) : null,  // Decimal -> number
    currency: c.currency ?? null,
    type: c.type,                                        // REG/DEP/SALE/...
    txId: c.txId ?? null,
  }));

  return NextResponse.json(safe);
}
