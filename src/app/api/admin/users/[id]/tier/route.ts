import {
  NextResponse,
} from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdminStepUp,
} from "@/lib/api-guards";

export async function POST(
  request: Request,
  props: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  const params = await props.params;
  const { session, res } =
    await requireAdminStepUp();

  if (res) {
    return res;
  }

  const body = await request
    .json()
    .catch(() => ({}));

  const tier = Number(
    body?.tier,
  );

  if (
    !Number.isInteger(tier) ||
    ![1, 2, 3].includes(tier)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_TIER",
      },
      {
        status: 400,
      },
    );
  }

  const target =
    await prisma.user.findUnique({
      where: {
        id: params.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tier: true,
      },
    });

  if (!target) {
    return NextResponse.json(
      {
        ok: false,
        error: "USER_NOT_FOUND",
      },
      {
        status: 404,
      },
    );
  }

  if (target.role !== "USER") {
    return NextResponse.json(
      {
        ok: false,
        error:
          "AFFILIATE_ONLY",
        message:
          "Tier can only be changed for affiliate USER accounts.",
      },
      {
        status: 409,
      },
    );
  }

  if (target.tier === tier) {
    return NextResponse.json({
      ok: true,
      user: {
        id: target.id,
        tier: target.tier,
      },
      unchanged: true,
    });
  }

  const actorId = String(
    (session!.user as any)?.id ||
      "",
  );

  const updated =
    await prisma.$transaction(
      async (tx) => {
        const user =
          await tx.user.update({
            where: {
              id: target.id,
            },
            data: {
              tier,
            },
            select: {
              id: true,
              tier: true,
            },
          });

        await tx.nexusSecurityEvent.create({
          data: {
            eventType:
              "AFFILIATE_TIER_CHANGED",
            userId:
              actorId || null,
            metadata: {
              targetUserId:
                target.id,
              objectLabel:
                target.name ||
                target.email,
              oldTier:
                target.tier,
              newTier: tier,
            },
          },
        });

        return user;
      },
    );

  return NextResponse.json({
    ok: true,
    user: updated,
  });
}