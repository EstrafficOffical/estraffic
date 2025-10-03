// src/app/api/admin/offers/list/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const role = (session.user as any)?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const items = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      cpa: true,
      geo: true,
      vertical: true,
      mode: true,
      status: true,
      hidden: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items });
}
