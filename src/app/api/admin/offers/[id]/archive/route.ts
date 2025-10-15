import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = params.id;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  const offer = await prisma.offer.update({
    where: { id },
    data: { status: "ARCHIVED", hidden: true },
    select: { id: true, status: true, hidden: true },
  });

  return NextResponse.json({ ok: true, offer });
}
