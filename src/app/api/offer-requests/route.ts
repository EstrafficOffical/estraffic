import { NextResponse } from "next/server";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const items = await prisma.offerRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { offer: { select: { id: true, title: true } } },
  });

  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json().catch(() => ({}));
  const offerId = String(body.offerId ?? "");
  if (!offerId) {
    return NextResponse.json({ ok: false, error: "offerId required" }, { status: 400 });
  }

  const data = await prisma.offerRequest.upsert({
    where: { userId_offerId: { userId, offerId } },
    update: { status: "PENDING" },
    create: { userId, offerId, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, data });
}
