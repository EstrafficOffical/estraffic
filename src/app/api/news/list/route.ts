import prisma from "@/lib/prisma";

export async function GET() {
  // Модель News (если иначе — поправим)
  const items = (await (prisma as any).news?.findMany?.({
    orderBy: { publishedAt: "desc" },
    take: 5,
  })) as any[] | undefined;

  const safe = (items ?? []).map((n: any) => ({
    title: String(n?.title ?? ""),
    date: (
      n?.publishedAt instanceof Date
        ? n.publishedAt
        : new Date(n?.publishedAt ?? Date.now())
    )
      .toISOString()
      .slice(0, 10),
  }));

  return Response.json(safe);
}
