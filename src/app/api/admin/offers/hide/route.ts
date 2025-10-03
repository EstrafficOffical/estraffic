// src/app/api/admin/offers/hide/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { offerId, hidden } = await req.json().catch(() => ({}));
  if (!offerId || typeof hidden !== "boolean") {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  await prisma.offer.update({
    where: { id: offerId },
    data: { hidden },
  });

  return NextResponse.json({ ok: true });
}
