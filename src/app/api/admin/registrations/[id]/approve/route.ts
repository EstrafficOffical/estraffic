import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-guards";

const bodySchema = z.object({
  tier: z.number().int().min(1).max(3).default(3),
  managerId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, res } = await requireAdmin();
  if (res) return res;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid approval settings" }, { status: 400 });
  }

  const application = await prisma.affiliateApplication.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });
  if (!application) return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  if (application.status !== "PENDING") {
    return NextResponse.json({ ok: false, error: "Application has already been reviewed" }, { status: 409 });
  }

  const managerId = parsed.data.managerId || null;
  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId }, select: { role: true, status: true } });
    if (!manager || !["MANAGER", "ADMIN", "OWNER"].includes(manager.role) || manager.status !== "APPROVED") {
      return NextResponse.json({ ok: false, error: "Selected manager is not an active staff member" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: application.userId },
      data: {
        status: "APPROVED",
        role: "USER",
        tier: parsed.data.tier,
        assignedManagerId: managerId,
      },
    }),
    prisma.affiliateApplication.update({
      where: { id: application.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedById: session!.user.id,
        rejectionReason: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
