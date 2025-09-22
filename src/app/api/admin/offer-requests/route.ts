import { NextResponse } from "next/server";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user || role !== "ADMIN") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") ?? "PENDING").toUpperCase() as "PENDING" | "APPROVED" | "REJECTED";
  const q = (searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const skip = (page - 1) * limit;

  const where: any = { status };
  if (q) {
    where.OR = [
      { user: { email: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { offer: { title: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.offerRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, email: true, name: true, telegram: true } },
        offer: { select: { id: true, title: true } },
      },
    }),
    prisma.offerRequest.count({ where }),
  ]);

  return NextResponse.json({ ok: true, page, limit, total, items });
}
