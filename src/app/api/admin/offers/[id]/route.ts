import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const id = params.id;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  // запретим удаление, если есть клики или конверсии
  const [clicks, convs] = await Promise.all([
    prisma.click.count({ where: { offerId: id } }),
    prisma.conversion.count({ where: { offerId: id } }),
  ]);
  if (clicks > 0 || convs > 0) {
    return NextResponse.json(
      { error: "HAS_DEPENDENCIES", clicks, conversions: convs, hint: "Use ARCHIVE instead" },
      { status: 400 }
    );
  }

  await prisma.offer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
