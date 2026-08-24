import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export async function POST(req: Request) {
  const { res } = await requireAdminStepUp();
  if (res) return res;

  const { id, status } = await req.json().catch(() => ({}));

  if (!id || !["ACTIVE", "ARCHIVED", "PAUSED"].includes(status)) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    await prisma.offer.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.code || "DB_ERROR" },
      { status: 400 },
    );
  }
}