import prisma from "@/lib/prisma";

export async function GET() {
  // Берём без select, чтобы не упираться в расхождения схемы
  const rows = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  // Приводим к унифицированному виду, поддерживая и title, и name
  const safe = (rows as any[]).map((o) => ({
    id: o?.id,
    title: String(o?.title ?? o?.name ?? "Offer"),            // title | name
    tag: o?.tag ?? null,
    cpa: o?.cpa != null ? Number(o.cpa) : Number(o?.payout ?? 0), // cpa | payout
    geo: String(
      Array.isArray(o?.geo) ? o.geo.join(",") : o?.geo ?? ""
    ),
    vertical: String(o?.vertical ?? o?.verticals ?? ""),

    kpi1: Number(o?.kpi1 ?? o?.epc ?? 0),
    kpi2: Number(o?.kpi2 ?? o?.cr ?? 0),

    mode: String(o?.mode ?? "Auto"),
  }));

  return Response.json(safe);
}
