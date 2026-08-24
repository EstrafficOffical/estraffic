import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function POST(
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

  const offer = await prisma.offer.update({
    where: { id },
    data: { status: "ARCHIVED", hidden: true },
    select: { id: true, status: true, hidden: true },
  });

  return NextResponse.json({ ok: true, offer });
}