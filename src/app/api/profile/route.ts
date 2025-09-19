// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/api-guards";

export async function PATCH(req: Request) {
  const { session, res } = await requireAuth();
  if (res) return res;

  const userId = (session!.user as any).id as string;

  const body = await req.json().catch(() => ({} as any));
  const nameRaw = (body?.name ?? "") as string;
  const tgRaw = (body?.telegram ?? "") as string;

  const name = nameRaw.trim();
  const telegram = tgRaw.trim().replace(/^@/, ""); // храним без @

  if (name && (name.length < 1 || name.length > 80)) {
    return NextResponse.json({ error: "Имя должно быть 1–80 символов" }, { status: 400 });
  }
  if (telegram && telegram.length > 64) {
    return NextResponse.json({ error: "Telegram слишком длинный" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== "" ? { name } : { name: null }),
      ...(tgRaw !== "" ? { telegram } : { telegram: null }),
    },
    select: { id: true, name: true, telegram: true },
  });

  return NextResponse.json({ ok: true, user });
}
