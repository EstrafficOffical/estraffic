// src/app/api/admin/offer-requests/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const requests = await prisma.offerRequest.findMany({
    where: {},
    orderBy: { createdAt: "desc" },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit,
    include: {
      // user: добавляем безопасно (телеграм опционален)
      user: {
        // @ts-ignore — в текущем сгенерённом Prisma Client поле telegram может отсутствовать
        select: { id: true, email: true, name: true, telegram: true } as const,
      },
      offer: { select: { id: true, title: true } as const },
    },
  });

  const nextCursor = requests.length === limit ? requests[requests.length - 1]!.id : null;

  // Нормализуем ответ так, чтобы telegram был опциональным
const data = requests.map((r) => {
  const ru: any = (r as any).user ?? null;
  const ro: any = (r as any).offer ?? null;

  return {
    id: r.id,
    status: r.status,
    createdAt: r.createdAt,
    user: {
      id: ru?.id ?? null,
      email: ru?.email ?? null,
      name: ru?.name ?? null,
      // @ts-ignore – поле может отсутствовать в типах клиента
      telegram: ru?.telegram ?? null,
    },
    offer: {
      id: ro?.id ?? null,
      title: ro?.title ?? null,
    },
  };
});


  return NextResponse.json({ ok: true, data, nextCursor });
}
