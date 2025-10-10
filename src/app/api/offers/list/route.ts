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
      tag: true,                // ← добавили тег
      geo: true,
      vertical: true,
      cpa: true,
      cap: true,
      // KPI: поддерживаем и текстовые, и числовые (для обратной совместимости)
      kpi1: true,
      kpi2: true,
      kpi1Text: true,
      kpi2Text: true,
      mode: true,
      accesses: { where: { userId }, select: { approved: true }, take: 1 },
      requests: { where: { userId }, select: { status: true }, take: 1 },
    },
  });

  return NextResponse.json({
    items: offers.map((o) => ({
      id: o.id,
      title: o.title,
      tag: o.tag ?? null,       // ← прокидываем тег
      geo: o.geo,
      vertical: o.vertical,
      cpa: o.cpa != null ? Number(o.cpa) : null,
      cap: o.cap != null ? Number(o.cap) : null,
      // KPI: отдадим текст если есть, иначе число
      kpi1Text: o.kpi1Text ?? null,
      kpi2Text: o.kpi2Text ?? null,
      kpi1: o.kpi1 ?? null,
      kpi2: o.kpi2 ?? null,
      mode: o.mode,
      approved: !!o.accesses[0]?.approved,
      requested: !!o.requests[0],
    })),
  });
}
