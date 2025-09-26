// src/app/api/offers/requests/[id]/reject/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { res } = await requireAdmin();
  if (res) return res;

  const id = params.id;

  try {
    await prisma.offerRequest.update({
      where: { id },
      data: {
        // ✔ строковое значение enum'а
        status: "REJECTED",
        processedAt: new Date(),
      },
    });

    // Доступ не выдаём
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return NextResponse.json({ ok: false, error: "Request not found" }, { status: 404 });
    }
    console.error("reject request error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
