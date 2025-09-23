// src/app/api/admin/users/[id]/ban/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { res } = await requireAdmin();
  if (res) return res;

  await prisma.user.update({
    where: { id: params.id },
    // Кастим весь объект, чтобы TS не ругался, если поля нет в типах
    data: { status: "BANNED" } as any,
  });

  return NextResponse.json({ ok: true });
}
