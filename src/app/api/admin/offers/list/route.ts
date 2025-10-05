import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      geo: true,
      vertical: true,
      cpa: true,
      cap: true,
      mode: true,
      status: true,
      hidden: true,
      minDeposit: true,
      holdDays: true,
      createdAt: true,
      updatedAt: true,
    } as any,
  });

  return NextResponse.json({ items });
}
