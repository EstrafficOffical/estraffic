// src/app/api/admin/requests/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session as any)?.user?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const status =
    (req.nextUrl.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null) ?? null;

  const requests = await prisma.offerRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      // telegram НЕ выбираем напрямую — добавим ниже через any
      user: { select: { id: true, email: true, name: true } },
      offer: { select: { id: true, title: true } },
    },
  });

  // Нормализуем ответ: добавим telegram как опциональное поле
  const items = requests.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    user: {
      id: r.user?.id ?? null,
      email: r.user?.email ?? null,
      name: r.user?.name ?? null,
      // @ts-ignore — поле может отсутствовать в типах, поэтому читаем через any
      telegram: (r.user as any)?.telegram ?? null,
    },
    offer: {
      id: r.offer?.id ?? null,
      title: r.offer?.title ?? null,
    },
  }));

  return NextResponse.json({ ok: true, items });
}
