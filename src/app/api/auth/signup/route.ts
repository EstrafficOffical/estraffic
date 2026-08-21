import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const applicationSchema = z.object({
  email: z.string().trim().email().max(191),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120),
  telegram: z.string().trim().min(2).max(191),
  company: z.string().trim().min(2).max(191),
  trafficSources: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  mainGeos: z.array(z.string().trim().min(2).max(12)).min(1).max(40),
  verticalInterests: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  experience: z.string().trim().min(1).max(500),
  estimatedMonthlyVolume: z.string().trim().min(1).max(191),
  about: z.string().trim().max(4000).optional().default(""),
});

export async function POST(req: Request) {
  try {
    const parsed = applicationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Please check the application fields and try again." },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const email = input.email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (exists) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const rounds = Number.parseInt(String(process.env.BCRYPT_SALT_ROUNDS ?? 12), 10);
    const passwordHash = await bcrypt.hash(input.password, Number.isFinite(rounds) ? rounds : 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: input.name,
          telegram: input.telegram,
          passwordHash,
          role: "USER",
          status: "PENDING",
          tier: 3,
        },
        select: { id: true, email: true },
      });

      const application = await tx.affiliateApplication.create({
        data: {
          userId: user.id,
          company: input.company,
          trafficSources: input.trafficSources,
          mainGeos: input.mainGeos,
          verticalInterests: input.verticalInterests,
          experience: input.experience,
          estimatedMonthlyVolume: input.estimatedMonthlyVolume,
          about: input.about || null,
          status: "PENDING",
        },
        select: { id: true, status: true, createdAt: true },
      });

      return { user, application };
    });

    return NextResponse.json(
      {
        ok: true,
        userId: created.user.id,
        applicationId: created.application.id,
        status: created.application.status,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("NEXUS signup error", error);
    return NextResponse.json({ ok: false, error: "Server error. Please try again." }, { status: 500 });
  }
}
