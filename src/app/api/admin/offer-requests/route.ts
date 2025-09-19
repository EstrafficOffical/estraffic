// src/app/api/admin/offer-requests/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

// GET /api/admin/offer-requests?status=PENDING|APPROVED|REJECTED&q=&page=1&perPage=20
export async function GET(req: Request) {
  const { res } = await requireAdmin();
  if (res) return res;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 20)));

  const where: any = {
    AND: [
      status ? { status } : {},
      q
        ? {
            OR: [
              { user: { email: { contains: q, mode: "insensitive" } } },
              { offer: { title: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
    ],
  };

  const [total, items] = await Promise.all([
    prisma.offerRequest.count({ where }),
    prisma.offerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { id: true, email: true, name: true } },
        offer: { select: { id: true, title: true, tag: true } },
      },
    }),
  ]);

  const list = items.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    user: { id: r.user.id, email: r.user.email, name: r.user.name },
    offer: { id: r.offer.id, title: r.offer.title, tag: r.offer.tag },
  }));

  return NextResponse.json({ page, perPage, total, items: list });
}
