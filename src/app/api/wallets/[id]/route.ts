// DELETE /api/wallets/:id -> удалить мой кошелёк
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const w = await prisma.wallet.findFirst({ where: { id: params.id, userId } });
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.wallet.delete({ where: { id: params.id } });

  // если удалили основной — ничего не делаем, просто без основного.
  return NextResponse.json({ ok: true });
}
