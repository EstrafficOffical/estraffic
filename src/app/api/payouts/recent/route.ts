import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // Берём последние 4 выплаты без лишних include
  const rows = await prisma.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
    select: {
      id: true,
      createdAt: true,
      amount: true,
      currency: true,
      // если в модели есть поле status — раскомментируй
      // status: true,
    },
  });

  const safe = rows.map((r) => ({
    id: r.id,
    date: r.createdAt.toISOString().slice(0, 10),
    amount: Number(r.amount),
    currency: String(r.currency ?? ""),
    // status: r.status ?? "", // ← если поле существует в схеме Payout
  }));

  return new Response(JSON.stringify({ ok: true, items: safe }), {
    headers: { "content-type": "application/json" },
  });
}
