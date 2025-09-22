import { NextResponse } from "next/server";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [offers, accesses, requests] = await Promise.all([
    prisma.offer.findMany({
      select: {
        id: true,
        title: true,
        tag: true,
        geo: true,
        vertical: true,
        cpa: true,
        mode: true,
        targetUrl: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.offerAccess.findMany({ where: { userId }, select: { offerId: true, approved: true } }),
    prisma.offerRequest.findMany({ where: { userId }, select: { offerId: true, status: true, id: true } }),
  ] as const);

  const accessSet = new Set(accesses.filter((a) => a.approved).map((a) => a.offerId));
  const reqMap = new Map(requests.map((r) => [r.offerId, r] as const));

  const items = offers.map((o) => {
    let status: "APPROVED" | "REQUESTED" | "REJECTED" | "NONE" = "NONE";
    if (accessSet.has(o.id)) status = "APPROVED";
    else if (reqMap.has(o.id)) {
      const st = reqMap.get(o.id)!.status;
      status = st === "APPROVED" ? "APPROVED" : st === "REJECTED" ? "REJECTED" : "REQUESTED";
    }
    return {
      ...o,
      cpa: o.cpa != null ? Number(o.cpa) : null,
      status,
      requestId: reqMap.get(o.id)?.id ?? null,
    };
  });

  return NextResponse.json({ items });
}
