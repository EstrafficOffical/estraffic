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

  // клики по офферам
  const clicks = await prisma.click.groupBy({
    by: ["offerId"],
    _count: { _all: true },
    where: { createdAt: { gte, lt } },
  });

  // конверсии по офферам/типам
  const conv = await prisma.conversion.groupBy({
    by: ["offerId", "type"],
    _count: { _all: true },
    _sum: { amount: true },
    where: { createdAt: { gte, lt } },
  });

  // уникальные пользователи по офферу
  const users = await prisma.conversion.groupBy({
    by: ["offerId", "userId"],
    where: { createdAt: { gte, lt }, userId: { not: null } },
  });

  // Заголовки офферов
  const offers = await prisma.offer.findMany({
    select: { id: true, title: true },
  });
  const titleById = Object.fromEntries(offers.map((o) => [o.id, o.title]));

  const map: Record<string, any> = {};
  for (const c of clicks) {
    map[c.offerId] = {
      offerId: c.offerId,
      title: titleById[c.offerId] || c.offerId,
      clicks: c._count._all,
      regs: 0,
      deps: 0,
      revenue: 0,
      users: 0,
    };
  }
  for (const v of conv) {
    const row = (map[v.offerId] ||= {
      offerId: v.offerId,
      title: titleById[v.offerId] || v.offerId,
      clicks: 0, regs: 0, deps: 0, revenue: 0, users: 0,
    });
    if (v.type === "REG") row.regs = v._count._all;
    if (v.type === "DEP") row.deps = v._count._all;
    row.revenue += Number(v._sum.amount ?? 0);
  }
  const usersPerOffer: Record<string, Set<string>> = {};
  for (const u of users) {
    if (!u.userId) continue;
    (usersPerOffer[u.offerId] ||= new Set()).add(u.userId);
  }
  for (const [offerId, set] of Object.entries(usersPerOffer)) {
    if (!map[offerId]) {
      map[offerId] = {
        offerId,
        title: titleById[offerId] || offerId,
        clicks: 0, regs: 0, deps: 0, revenue: 0, users: 0,
      };
    }
    map[offerId].users = set.size;
  }

  const items = Object.values(map).sort((a: any, b: any) => b.revenue - a.revenue);
  return NextResponse.json({ items });
}
