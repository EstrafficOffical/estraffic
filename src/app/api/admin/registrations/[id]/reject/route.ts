import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

const bodySchema = z.object({ reason: z.string().trim().max(2000).optional().default("") });

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, res } = await requireAdmin();
  if (res) return res;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid rejection reason" }, { status: 400 });

  const application = await prisma.affiliateApplication.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!application) return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  if (application.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Application has already been reviewed" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: application.userId }, data: { status: "PENDING" } }),
    prisma.affiliateApplication.update({
      where: { id: application.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: session!.user.id,
        rejectionReason: parsed.data.reason || null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
