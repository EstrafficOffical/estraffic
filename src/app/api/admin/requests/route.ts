import { NextResponse, NextRequest } from "next/server";
import {auth} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session as any)?.user?.role as string | undefined;

  if (!session?.user || role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const status =
    (req.nextUrl.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | null) ?? null;

  const items = await prisma.offerRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true, telegram: true } },
      offer: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json({ ok: true, items });
}
