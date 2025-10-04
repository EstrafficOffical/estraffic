// src/app/api/postbacks/conversions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([]);

  const url = new URL(req.url);

  const isAdmin = (session.user as any)?.role === "ADMIN";
  const all = isAdmin && url.searchParams.get("all") === "1"; // ← только админу разрешаем all=1

  // необязательные фильтры
  const type = url.searchParams.get("type") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: any = {};
  if (!all) where.userId = (session.user as any).id; // обычному пользователю — только свои
  if (type && type !== "ALL") where.type = type as any;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }

  const items = await prisma.conversion.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      offer: { select: { id: true, title: true } },
      user:  { select: { id: true, email: true, name: true } },
    },
  });

  return NextResponse.json(items);
}
