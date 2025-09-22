import { NextResponse } from "next/server";
import  {auth}  from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const rows = await prisma.offerAccess.findMany({
    where: { userId, approved: true },
    include: { offer: true },
    orderBy: { createdAt: "desc" },
  });

  const items = rows.map((r) => ({
    id: r.offer.id,
    title: r.offer.title,
    tag: r.offer.tag,
    geo: r.offer.geo,
    vertical: r.offer.vertical,
    cpa: r.offer.cpa != null ? Number(r.offer.cpa) : null,
    mode: r.offer.mode,
    targetUrl: r.offer.targetUrl,
  }));

  return NextResponse.json({ items });
}
