import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 864e5);
  const toDate = to ? new Date(to) : new Date();

  // ПОДГОНИ под свою схему при желании:
  // модели и поля: click.createdAt, conversion.createdAt, conversion.status, conversion.amount
  const clicks = await (prisma as any).click?.count?.({
    where: { createdAt: { gte: fromDate, lte: toDate } },
  }).catch?.(() => 0) ?? 0;

  const conversions = await (prisma as any).conversion?.count?.({
    where: { createdAt: { gte: fromDate, lte: toDate }, status: "approved" },
  }).catch?.(() => 0) ?? 0;

  // сумма выручки; если поле называется иначе (revenue/payout/amount) — замени "amount"
  const revenueAgg = await (prisma as any).conversion?.aggregate?.({
    _sum: { amount: true },
    where: { createdAt: { gte: fromDate, lte: toDate }, status: "approved" },
  }).catch?.(() => ({ _sum: {} })) ?? { _sum: {} };

  const revenue =
    Number(revenueAgg?._sum?.amount ??
      revenueAgg?._sum?.revenue ??
      revenueAgg?._sum?.payout ?? 0);

  return Response.json({
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    clicks,
    conversions,
    revenue,
  });
}
