import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseDates(req: Request) {
  const u = new URL(req.url);
  const from = u.searchParams.get("from");
  const to = u.searchParams.get("to");
  const gte = from ? new Date(from + "T00:00:00.000Z") : undefined;
  // включительно по дате "to": +1 день как верхняя граница
  const lt = to ? new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000) : undefined;
  return { gte, lt };
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { gte, lt } = parseDates(req);

  const [clicks, convs] = await Promise.all([
    prisma.click.count({ where: { createdAt: { gte, lt } } }),
    prisma.conversion.groupBy({
      by: ["type"],
      _count: { _all: true },
      _sum: { amount: true },
      where: { createdAt: { gte, lt } },
    }),
  ]);

  let regs = 0, deps = 0, revenue = 0;
  for (const c of convs) {
    if (c.type === "REG") regs = c._count._all;
    if (c.type === "DEP") deps = c._count._all;
    revenue += Number(c._sum.amount ?? 0);
  }

  return NextResponse.json({ clicks, regs, deps, revenue });
}
