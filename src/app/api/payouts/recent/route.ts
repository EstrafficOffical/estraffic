import prisma from "@/lib/prisma";

export async function GET() {
  // Модель Payout + связь wallet (если иначе — подправим)
  const rows = (await (prisma as any).payout?.findMany?.({
    orderBy: { createdAt: "desc" },
    take: 4,
    include: { wallet: true },
  })) as any[] | undefined;

  const safe = (rows ?? []).map((r: any) => ({
    id: r?.id,
    date: (r?.createdAt instanceof Date
      ? r.createdAt
      : new Date(r?.createdAt ?? Date.now())
    )
      .toISOString()
      .slice(0, 10),
    amount: Number(r?.amount ?? 0),
    currency: String(r?.currency ?? ""),
    status: String(r?.status ?? ""),
    wallet: String(r?.wallet?.provider ?? ""),
  }));

  return Response.json(safe);
}
