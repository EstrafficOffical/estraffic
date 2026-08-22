import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  clientIp,
  rateLimitHeaders,
} from "@/lib/nexus-rate-limit";
import { createApplicationStatusToken } from "@/lib/nexus-application-status";

export const dynamic = "force-dynamic";

const applicationSchema = z.object({
  email: z.string().trim().email().max(191),
  password: z.string().min(8).max(128),
  name: z.string().trim().min(2).max(120),
  telegram: z.string().trim().min(2).max(191),
  company: z.string().trim().min(2).max(191),
  trafficSources: z
    .array(
      z.string().trim().min(1).max(80),
    )
    .min(1)
    .max(20),
  mainGeos: z
    .array(
      z.string().trim().min(2).max(12),
    )
    .min(1)
    .max(40),
  verticalInterests: z
    .array(
      z.string().trim().min(1).max(80),
    )
    .min(1)
    .max(20),
  experience: z
    .string()
    .trim()
    .min(1)
    .max(500),
  estimatedMonthlyVolume: z
    .string()
    .trim()
    .min(1)
    .max(191),
  about: z
    .string()
    .trim()
    .max(4000)
    .optional()
    .default(""),
});

function limited(
  result: Awaited<
    ReturnType<typeof checkRateLimit>
  >,
) {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Too many applications. Please try again later.",
    },
    {
      status: 429,
      headers: rateLimitHeaders(result),
    },
  );
}

export async function POST(req: Request) {
  try {
    const ipLimit = await checkRateLimit({
      scope: "signup-ip",
      identifier: clientIp(req),
      limit: 5,
      windowSeconds: 60 * 60,
    });

    if (!ipLimit.allowed) {
      return limited(ipLimit);
    }

    const parsed =
      applicationSchema.safeParse(
        await req.json(),
      );

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please check the application fields and try again.",
        },
        {
          status: 400,
        },
      );
    }

    const input = parsed.data;
    const email =
      input.email.toLowerCase();

    const emailLimit =
      await checkRateLimit({
        scope: "signup-email",
        identifier: email,
        limit: 3,
        windowSeconds: 24 * 60 * 60,
      });

    if (!emailLimit.allowed) {
      return limited(emailLimit);
    }

    const exists =
      await prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

    if (exists) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const configuredRounds =
      Number.parseInt(
        String(
          process.env.BCRYPT_SALT_ROUNDS ??
            12,
        ),
        10,
      );

    const rounds =
      Number.isFinite(configuredRounds)
        ? Math.min(
            Math.max(
              configuredRounds,
              10,
            ),
            15,
          )
        : 12;

    const passwordHash =
      await bcrypt.hash(
        input.password,
        rounds,
      );

    const created =
      await prisma.$transaction(
        async (tx) => {
          const user =
            await tx.user.create({
              data: {
                email,
                name: input.name,
                telegram:
                  input.telegram,
                passwordHash,
                role: "USER",
                status: "PENDING",
                tier: 3,
              },
              select: {
                id: true,
                email: true,
              },
            });

          const application =
            await tx.affiliateApplication.create(
              {
                data: {
                  userId: user.id,
                  company:
                    input.company,
                  trafficSources:
                    input.trafficSources,
                  mainGeos:
                    input.mainGeos,
                  verticalInterests:
                    input.verticalInterests,
                  experience:
                    input.experience,
                  estimatedMonthlyVolume:
                    input.estimatedMonthlyVolume,
                  about:
                    input.about ||
                    null,
                  status:
                    "PENDING",
                },
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                },
              },
            );

          return {
            user,
            application,
          };
        },
      );

    const statusToken =
      createApplicationStatusToken({
        applicationId:
          created.application.id,
        userId: created.user.id,
      });

    return NextResponse.json(
      {
        ok: true,
        userId:
          created.user.id,
        applicationId:
          created.application.id,
        status:
          created.application.status,
        statusToken,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "NEXUS signup error",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Server error. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}
