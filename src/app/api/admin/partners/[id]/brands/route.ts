import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminStepUp } from "@/lib/api-guards";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  props: {
    params: Promise<{ id: string }>;
  },
) {
  const guard = await requireAdminStepUp();

  if (guard.res) {
    return guard.res;
  }

  const actorId = String(
    (guard.session?.user as any)?.id || "",
  );

  const { id } = await props.params;

  if (!id) {
    return NextResponse.json(
      { error: "PARTNER_ID_REQUIRED" },
      { status: 400 },
    );
  }

  const body = await req
    .json()
    .catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const requestedIds: string[] =
    Array.isArray(body.brandIds)
      ? body.brandIds
          .map((value: unknown) =>
            String(value || "").trim(),
          )
          .filter(
            (value: string) =>
              value.length > 0,
          )
      : [];

  const brandIds: string[] =
    Array.from(
      new Set<string>(requestedIds),
    );

  if (brandIds.length > 500) {
    return NextResponse.json(
      { error: "TOO_MANY_BRANDS" },
      { status: 400 },
    );
  }

  const partner =
    await prisma.partner.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

  if (!partner) {
    return NextResponse.json(
      { error: "PARTNER_NOT_FOUND" },
      { status: 404 },
    );
  }

  const [currentlyAssigned, selectedBrands] =
    await Promise.all([
      prisma.brand.findMany({
        where: {
          defaultPartnerId: id,
        },
        select: {
          id: true,
          name: true,
          defaultPartnerId: true,
        },
      }),

      brandIds.length
        ? prisma.brand.findMany({
            where: {
              id: {
                in: brandIds,
              },
            },
            select: {
              id: true,
              name: true,
              defaultPartnerId: true,
            },
          })
        : [],
    ]);

  if (
    selectedBrands.length !==
    brandIds.length
  ) {
    return NextResponse.json(
      { error: "BRAND_NOT_FOUND" },
      { status: 404 },
    );
  }

  const before = Array.from(
    new Map(
      [
        ...currentlyAssigned,
        ...selectedBrands,
      ].map((brand) => [
        brand.id,
        brand,
      ]),
    ).values(),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.brand.updateMany({
        where: {
          defaultPartnerId: id,
          ...(brandIds.length
            ? {
                id: {
                  notIn: brandIds,
                },
              }
            : {}),
        },
        data: {
          defaultPartnerId: null,
        },
      });

      if (brandIds.length) {
        await tx.brand.updateMany({
          where: {
            id: {
              in: brandIds,
            },
          },
          data: {
            defaultPartnerId: id,
          },
        });
      }

      await tx.nexusSecurityEvent.create({
        data: {
          eventType:
            "PARTNER_BRANDS_UPDATED",
          userId: actorId || null,
          metadata: {
            partnerId: partner.id,
            partnerName: partner.name,
            before: before.map(
              (brand) => ({
                id: brand.id,
                name: brand.name,
                defaultPartnerId:
                  brand.defaultPartnerId,
              }),
            ),
            afterBrandIds: brandIds,
          },
        },
      });
    },
  );

  const assigned =
    await prisma.brand.findMany({
      where: {
        defaultPartnerId: id,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

  return NextResponse.json(
    {
      ok: true,
      partner: {
        id: partner.id,
        name: partner.name,
      },
      brands: assigned,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}