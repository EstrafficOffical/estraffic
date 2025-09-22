import { NextResponse } from "next/server";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = (await req.json().catch(() => null)) as { offerId?: string; message?: string } | null;
  const offerId = body?.offerId;
  if (!offerId) return NextResponse.json({ error: "offerId is required" }, { status: 400 });

  // уже есть доступ?
  const access = await prisma.offerAccess.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });
  if (access?.approved) {
    return NextResponse.json({ ok: true, status: "APPROVED" });
  }

  // уже есть заявка?
  const existing = await prisma.offerRequest.findUnique({
    where: { userId_offerId: { userId, offerId } },
  });
  if (existing) {
    const status =
      existing.status === "APPROVED"
        ? "APPROVED"
        : existing.status === "REJECTED"
        ? "REJECTED"
        : "REQUESTED";
    return NextResponse.json({ ok: true, status, id: existing.id });
  }

  const created = await prisma.offerRequest.create({
    data: { userId, offerId, message: body?.message ?? null, status: "PENDING" },
  });

  return NextResponse.json({ ok: true, status: "REQUESTED", id: created.id });
}
