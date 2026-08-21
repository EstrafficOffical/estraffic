import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NexusLanding from "@/app/components/NexusLanding";
import NexusAppShell from "@/app/components/NexusAppShell";
import NexusDashboard from "@/app/components/NexusDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
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
      assignedManager: { select: { name: true } },
    },
  });

  if (!user) return <NexusLanding locale={locale} />;

  const [clicks, registrations, ftd, revenueAgg, paidAgg, pendingPayoutAgg, approvedOffers, recent] = await Promise.all([
    prisma.nexusClick.count({ where: { userId } }),
    prisma.conversion.count({ where: { userId, type: "REG" } }),
    prisma.conversion.count({ where: { userId, type: "DEP" } }),
    prisma.conversion.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { userId, status: "Paid" }, _sum: { amount: true } }),
    prisma.payout.aggregate({ where: { userId, status: "Pending" }, _sum: { amount: true } }),
    prisma.flowAccess.count({ where: { userId, status: "APPROVED" } }),
    prisma.conversion.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 7,
      include: { offer: { select: { title: true } } },
    }),
  ]);

  const revenue = Number(revenueAgg._sum.amount || 0);
  const paid = Number(paidAgg._sum.amount || 0);
  const pendingPayouts = Number(pendingPayoutAgg._sum.amount || 0);
  const available = Math.max(0, revenue - paid - pendingPayouts);

  return (
    <NexusAppShell
      locale={locale}
      user={{ name: user.name, email: user.email, role: user.role, tier: user.tier }}
    >
      <NexusDashboard
        locale={locale}
        user={{ name: user.name, email: user.email, tier: user.tier, managerName: user.assignedManager?.name }}
        metrics={{ revenue, clicks, registrations, ftd, available, pendingPayouts, approvedOffers }}
        recentConversions={recent.map((c) => ({
          id: c.id,
          type: c.type,
          amount: Number(c.amount || 0),
          currency: c.currency || "USD",
          createdAt: c.createdAt,
          offerTitle: c.offer.title,
        }))}
      />
    </NexusAppShell>
  );
}
