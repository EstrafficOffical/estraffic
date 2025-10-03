import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, geo: true, vertical: true, cpa: true,
      mode: true, status: true, hidden: true, createdAt: true, updatedAt: true
    } as any,
  });

  return NextResponse.json({ items });
}
