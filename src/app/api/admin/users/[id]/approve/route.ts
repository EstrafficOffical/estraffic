// src/app/api/admin/users/[id]/approve/route.ts
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
    // Кастим весь объект, чтобы игнорировать отсутствие поля в типах Prisma Client
    data: { status: "APPROVED" } as any,
  });

  return NextResponse.json({ ok: true });
}
