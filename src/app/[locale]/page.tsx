import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import NexusLanding from "@/app/components/NexusLanding";
import NexusAppShell from "@/app/components/NexusAppShell";
import NexusDashboard from "@/app/components/NexusDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage(
  props: {
    params: Promise<{ locale: string }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  const session = await auth();

  if (!session?.user) {
    return <NexusLanding locale={locale} />;
  }

  if (session.user.status !== "APPROVED") {
    return <NexusLanding locale={locale} />;
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      tier: true,
      assignedManager: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!user) {
    return <NexusLanding locale={locale} />;
  }

  if (user.role === "MANAGER") {
    redirect(`/${locale}/manager/affiliates`);
  }

  if (["OWNER", "ADMIN"].includes(user.role)) {
    redirect(`/${locale}/admin/stats`);
  }

  const [
    clicks,
    registrations,
    ftd,
    revenueAgg,
    paidAgg,
    pendingPayoutAgg,
    financeLedgerRows,
    approvedOffers,
    recent,
  ] = await Promise.all([
    prisma.nexusClick.count({
      where: { userId },
    }),

    prisma.nexusConversion.count({
      where: {
        userId,
        type: "REG",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.count({
      where: {
        userId,
        type: "DEP",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.aggregate({
      where: {
        userId,
        status: "APPROVED",
      },
      _sum: {
        affiliatePayout: true,
      },
    }),

    prisma.payout.aggregate({
      where: {
        userId,
        status: "Paid",
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.payout.aggregate({
      where: {
        userId,
        status: "Pending",
      },
      _sum: {
        amount: true,
      },
    }),

    prisma.nexusFinanceLedger.groupBy({

      by: ["bucket"],

      where: {

        userId,

        currency: "USD",

      },

      _sum: {

        amount: true,

      },

    }),

    prisma.flowAccess.count({
      where: {
        userId,
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.findMany({
      where: {
        userId,
        status: "APPROVED",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 7,
      select: {
        id: true,
        flowId: true,
        type: true,
        affiliatePayout: true,
        currency: true,
        createdAt: true,
      },
    }),
  ]);

  const recentFlowIds = Array.from(
    new Set(recent.map((conversion) => conversion.flowId)),
  );

  const recentFlows = recentFlowIds.length
    ? await prisma.flow.findMany({
        where: {
          id: {
            in: recentFlowIds,
          },
        },
        select: {
          id: true,
          name: true,
          market: {
            select: {
              geo: true,
              brand: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      })
    : [];

  const flowLabelById = new Map(
    recentFlows.map((flow) => [
      flow.id,
      `${flow.market.brand.name} · ${flow.name}`,
    ]),
  );

  const revenue = Number(revenueAgg._sum.affiliatePayout || 0);
  const ledgerBalance = (bucket: string) =>
    Number(
      financeLedgerRows.find(
        (row) => String(row.bucket) === bucket,
      )?._sum.amount || 0,
    );

  const available = ledgerBalance("AVAILABLE");
  const pendingBalance = ledgerBalance("PENDING");

  return (
    <NexusAppShell
      locale={locale}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        tier: user.tier,
      }}
    >
      <NexusDashboard
        locale={locale}
        user={{
          name: user.name,
          email: user.email,
          tier: user.tier,
          managerName: user.assignedManager?.name,
        }}
        metrics={{
          revenue,
          clicks,
          registrations,
          ftd,
          available,
          pendingPayouts: pendingBalance,
          approvedOffers,
        }}
        recentConversions={recent.map((conversion) => ({
          id: conversion.id,
          type: conversion.type,
          amount: Number(conversion.affiliatePayout || 0),
          currency: conversion.currency || "USD",
          createdAt: conversion.createdAt,
          offerTitle:
            flowLabelById.get(conversion.flowId) || conversion.flowId,
        }))}
      />
    </NexusAppShell>
  );
}