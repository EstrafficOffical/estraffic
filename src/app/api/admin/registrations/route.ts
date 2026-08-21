import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { res } = await requireAdmin();
  if (res) return res;

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "PENDING").toUpperCase();
  const q = (url.searchParams.get("q") || "").trim();

  const rows = await prisma.affiliateApplication.findMany({
    where: {
      ...(status === "ALL" ? {} : { status: status as any }),
      ...(q
        ? {
            user: {
              is: {
                OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                  { telegram: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          telegram: true,
          tier: true,
          status: true,
          assignedManagerId: true,
          createdAt: true,
        },
      },
      reviewedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, items: rows });
}
