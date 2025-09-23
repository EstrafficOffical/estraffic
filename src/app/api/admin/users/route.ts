// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export async function GET(req: Request) {
  const { res } = await requireAdmin();
  if (res) return res;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = url.searchParams.get("status") ?? undefined; // PENDING|APPROVED|BANNED
  const role = url.searchParams.get("role") ?? undefined;     // USER|ADMIN
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? 20)));

  const where: any = {
    AND: [
      q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { telegram: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      status ? { status } : {},
      role ? { role } : {},
    ],
  };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      // status иногда ругался у тебя в типах — убираем из select
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    }),
  ]);

  const items = rows.map((u) => ({
    ...u,
    // достанем то, что могло не входить в select
    status: (u as any)?.status ?? null,
    telegram: (u as any)?.telegram ?? null,
  }));

  return NextResponse.json({ page, perPage, total, items });
}
