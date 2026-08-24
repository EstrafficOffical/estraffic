import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function POST(req: Request) {
  const { res } = await requireAdminStepUp();
  if (res) return res;

  const body = await req.json().catch(() => ({} as any));
  const { action, ids } = body || {};

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "NO_IDS" }, { status: 400 });
  }

  if (action === "archive") {
    await prisma.offer.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED", hidden: true },
    });

    return NextResponse.json({ ok: true, count: ids.length });
  }

  if (action === "delete") {
    const canDelete = await prisma.offer.findMany({
      where: {
        id: { in: ids },
        clicks: { none: {} },
        conversions: { none: {} },
      },
      select: { id: true },
    });

    if (canDelete.length === 0) {
      return NextResponse.json(
        {
          error: "NOTHING_TO_DELETE",
          hint: "Offers have clicks/conversions. Use ARCHIVE.",
        },
        { status: 400 },
      );
    }

    await prisma.offer.deleteMany({
      where: { id: { in: canDelete.map((item) => item.id) } },
    });

    return NextResponse.json({
      ok: true,
      deleted: canDelete.length,
      requested: ids.length,
    });
  }

  return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
}