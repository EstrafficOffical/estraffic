import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { session, res } = await requireAdmin();
  if (res) return res;

  const body = await req.json().catch(() => ({} as any));
  const tier = Number(body?.tier);

  if (![1, 2, 3].includes(tier)) {
    return NextResponse.json({ ok: false, error: "INVALID_TIER" }, { status: 400 });
  }

  const meId = (session!.user as any).id as string;

  // можно менять себе tier тоже, это не опасно
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { tier },
    select: { id: true, tier: true },
  });

  return NextResponse.json({ ok: true, user, meId });
}