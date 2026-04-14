import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DisplayStatus = "AVAILABLE" | "REQUESTED" | "IN_PROGRESS";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id as string;

  const offers = await prisma.offer.findMany({
    where: {
      hidden: false,
      status: "ACTIVE",
    },
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
      kpi1Text: true,
      kpi2Text: true,
      mode: true,
      accesses: {
        where: { userId },
        select: { approved: true },
        take: 1,
      },
      requests: {
        where: { userId },
        select: {
          status: true,
          createdAt: true,
          completedAt: true,
          processedAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const items = offers
    .map((o) => {
      const accessApproved = !!o.accesses[0]?.approved;
      const latestRequest = o.requests[0] ?? null;

      // Если доступ уже выдан — оффер в работе
      if (accessApproved) {
        return {
          id: o.id,
          title: o.title,
          geo: o.geo,
          vertical: o.vertical,
          cpa: o.cpa != null ? Number(o.cpa) : null,
          cap: o.cap != null ? Number(o.cap) : null,
          kpi1Text: o.kpi1Text ?? null,
          kpi2Text: o.kpi2Text ?? null,
          kpi1: o.kpi1 ?? null,
          kpi2: o.kpi2 ?? null,
          mode: o.mode,
          displayStatus: "IN_PROGRESS" as DisplayStatus,
        };
      }

      // Если последняя заявка отклонена — скрываем оффер из каталога
      if (latestRequest?.status === "REJECTED") {
        return null;
      }

      // Если последняя заявка pending — показываем Requested
      if (latestRequest?.status === "PENDING") {
        return {
          id: o.id,
          title: o.title,
          geo: o.geo,
          vertical: o.vertical,
          cpa: o.cpa != null ? Number(o.cpa) : null,
          cap: o.cap != null ? Number(o.cap) : null,
          kpi1Text: o.kpi1Text ?? null,
          kpi2Text: o.kpi2Text ?? null,
          kpi1: o.kpi1 ?? null,
          kpi2: o.kpi2 ?? null,
          mode: o.mode,
          displayStatus: "REQUESTED" as DisplayStatus,
        };
      }

      // Если заявки нет — доступен для запроса
      return {
        id: o.id,
        title: o.title,
        geo: o.geo,
        vertical: o.vertical,
        cpa: o.cpa != null ? Number(o.cpa) : null,
        cap: o.cap != null ? Number(o.cap) : null,
        kpi1Text: o.kpi1Text ?? null,
        kpi2Text: o.kpi2Text ?? null,
        kpi1: o.kpi1 ?? null,
        kpi2: o.kpi2 ?? null,
        mode: o.mode,
        displayStatus: "AVAILABLE" as DisplayStatus,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ items });
}