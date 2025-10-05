import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  const offers = await prisma.offer.findMany({
    where: { hidden: false, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      geo: true,
      vertical: true,
      cpa: true,
      cap: true,
      kpi1: true,
      kpi2: true,
      mode: true,
      accesses: { where: { userId }, select: { approved: true }, take: 1 },
      requests: { where: { userId }, select: { status: true }, take: 1 },
    },
  });

  return NextResponse.json({
    items: offers.map((o) => ({
      id: o.id,
      title: o.title,
      geo: o.geo,
      vertical: o.vertical,
      cpa: o.cpa != null ? Number(o.cpa) : null,
      cap: o.cap != null ? Number(o.cap) : null,
      kpi1: o.kpi1 ?? 0,
      kpi2: o.kpi2 ?? 0,
      mode: o.mode,
      approved: !!o.accesses[0]?.approved,
      requested: !!o.requests[0],
    })),
  });
}
