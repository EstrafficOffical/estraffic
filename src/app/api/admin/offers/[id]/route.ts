import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  const { res } = await requireAdminStepUp();
  if (res) return res;

  const id = params.id;
  if (!id) {
    return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });
  }

  const [clicks, convs] = await Promise.all([
    prisma.click.count({ where: { offerId: id } }),
    prisma.conversion.count({ where: { offerId: id } }),
  ]);

  if (clicks > 0 || convs > 0) {
    return NextResponse.json(
      {
        error: "HAS_DEPENDENCIES",
        clicks,
        conversions: convs,
        hint: "Use ARCHIVE instead",
      },
      { status: 400 },
    );
  }

  await prisma.offer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}