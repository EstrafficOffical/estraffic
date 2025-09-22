// src/app/api/offers/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  // защита API: только авторизованные пользователи
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const query   = (url.searchParams.get("query") ?? "").trim();
  const page    = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 20)));

  const geo      = url.searchParams.get("geo") ?? undefined;
  const vertical = url.searchParams.get("vertical") ?? undefined;
  const mode     = url.searchParams.get("mode") ?? undefined;

  const where: any = {
    AND: [
      geo      ? { geo } : {},
      vertical ? { vertical } : {},
      mode     ? { mode } : {},
      query
        ? {
            OR: [
              { title:    { contains: query, mode: "insensitive" } },
              { tag:      { contains: query, mode: "insensitive" } },
              { geo:      { contains: query, mode: "insensitive" } },
              { vertical: { contains: query, mode: "insensitive" } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.offer.count({ where }),
    prisma.offer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  const safe = (items as any[]).map((o) => ({
    id: o.id,
    title: o.title ?? o.name ?? "Offer",
    tag: o.tag ?? null,
    cpa: o.cpa != null ? Number(o.cpa) : 0,
    geo: o.geo ?? "",
    vertical: o.vertical ?? "",
    kpi1: o.kpi1 ?? 0,
    kpi2: o.kpi2 ?? 0,
    mode: o.mode ?? "Auto",
  }));

  return NextResponse.json({ page, perPage, total, items: safe });
}
