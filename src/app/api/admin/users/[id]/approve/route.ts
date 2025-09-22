// src/app/api/admin/users/[id]/approve/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { res } = await requireAdmin();
  if (res) return res;

  await prisma.user.update({
    where: { id: params.id },
    data: { status: "APPROVED" },
  });

  return NextResponse.json({ ok: true });
}
