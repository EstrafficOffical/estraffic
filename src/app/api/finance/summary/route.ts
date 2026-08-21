import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await auth();
  const userId = String((session?.user as any)?.id || "");

  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const grouped = await prisma.nexusFinanceLedger.groupBy({
    by: ["bucket"],
    where: {
      userId,
      currency: "USD",
    },
    _sum: {
      amount: true,
    },
  });

  const map = new Map(
    grouped.map((row) => [row.bucket, Number(row._sum.amount || 0)]),
  );

  const pending = map.get("PENDING") || 0;
  const available = map.get("AVAILABLE") || 0;
  const reserved = map.get("RESERVED") || 0;
  const paid = map.get("PAID") || 0;

  return NextResponse.json({
    ok: true,
    currency: "USD",
    available,
    pending,
    reserved,
    paid,
    totalEarned: pending + available + reserved + paid,
  });
}
