// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  name: z.string().trim().max(120).optional(),
  telegram: z.string().trim().max(191).optional().nullable(),
  email: z.string().trim().email().optional(),
  image: z.string().url().optional().nullable(), // 👈 поддержка аватара
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const id = session.user.id as string;

  // выбираем безопасный набор полей
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      // если у тебя когда-то были проблемы с типами — можно убрать эту строку
      telegram: true,
      role: true,
      status: true,
      tier: true,
      assignedManager: { select: { name: true, email: true, telegram: true } },
      application: {
        select: {
          company: true, trafficSources: true, mainGeos: true, verticalInterests: true,
          experience: true, estimatedMonthlyVolume: true, about: true,
        },
      },
    },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const id = session.user.id as string;

  const body = await req.json().catch(() => ({}));
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }

  const payload = parsed.data;

  const data: any = {};
  if (payload.name !== undefined) data.name = payload.name || null;
  if (payload.telegram !== undefined) data.telegram = payload.telegram || null;
  if (payload.email !== undefined) data.email = payload.email.toLowerCase();
  if (payload.image !== undefined) data.image = payload.image || null; // 👈 пишем/очищаем аватар

  try {
    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, telegram: true, image: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e: any) {
    // P2002 — например, уникальный email уже занят
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "DUPLICATE" }, { status: 409 });
    }
    return NextResponse.json({ error: e?.code || "DB_ERROR" }, { status: 400 });
  }
}
