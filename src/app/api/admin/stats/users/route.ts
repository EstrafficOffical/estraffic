import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDates(req: Request) {
  const u = new URL(req.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const gte = from ? new Date(from + "T00:00:00.000Z") : undefined;
  const lt = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined;
  return { gte, lt };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { gte, lt } = parseDates(req);

  // клики по пользователям
  const clicks = await prisma.click.groupBy({
    by: ["userId"],
    _count: { _all: true },
    where: { createdAt: { gte, lt }, userId: { not: null } },
  });

  // конверсии по пользователям/типам
  const conv = await prisma.conversion.groupBy({
    by: ["userId", "type", "offerId"],
    _count: { _all: true },
    _sum: { amount: true },
    where: { createdAt: { gte, lt }, userId: { not: null } },
  });

  const userIds = Array.from(new Set([
    ...clicks.map(c => c.userId!).filter(Boolean),
    ...conv.map(c => c.userId!).filter(Boolean),
  ]));

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      })
    : [];
  const uIndex = Object.fromEntries(users.map(u => [u.id, u]));

  const map: Record<string, any> = {};
  for (const c of clicks) {
    if (!c.userId) continue;
    map[c.userId] = {
      userId: c.userId,
      email: uIndex[c.userId]?.email ?? null,
      name: uIndex[c.userId]?.name ?? null,
      clicks: c._count._all,
      regs: 0,
      deps: 0,
      revenue: 0,
      offers: 0,
      _offerSet: new Set<string>(),
    };
  }
  for (const v of conv) {
    if (!v.userId) continue;
    const row = (map[v.userId] ||= {
      userId: v.userId,
      email: uIndex[v.userId]?.email ?? null,
      name: uIndex[v.userId]?.name ?? null,
      clicks: 0, regs: 0, deps: 0, revenue: 0, offers: 0,
      _offerSet: new Set<string>(),
    });
    if (v.type === "REG") row.regs += v._count._all;
    if (v.type === "DEP") row.deps += v._count._all;
    row.revenue += Number(v._sum.amount ?? 0);
    if (v.offerId) row._offerSet.add(v.offerId);
  }
  for (const r of Object.values(map) as any[]) {
    r.offers = r._offerSet.size;
    delete r._offerSet;
  }

  const items = Object.values(map).sort((a: any, b: any) => b.revenue - a.revenue);
  return NextResponse.json({ items });
}
