// src/app/api/admin/offers/list/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      tag: true,
      geo: true,
      vertical: true,
      cpa: true,
      cap: true,
      kpi1Text: true,
      kpi2Text: true,
      mode: true,
      targetUrl: true,
      status: true,
      hidden: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ items });
}
