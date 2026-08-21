import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function pct(value: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function short(value: string) {
  return value.length > 18
    ? `${value.slice(0, 8)}...${value.slice(-6)}`
    : value;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function ControlCenter({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const session = await auth();
  const role = String((session?.user as any)?.role || "");

  if (!session?.user || !["OWNER", "ADMIN"].includes(role)) {
    redirect(`/${locale}`);
  }

  const [
    pendingRegistrations,
    pendingAccessRequests,
    affiliates,
    staff,
    activeFlows,
    clicks,
    registrations,
    ftd,
    economics,
    recentConversions,
    recentApps,
  ] = await Promise.all([
    prisma.affiliateApplication.count({
      where: { status: "PENDING" },
    }),

    prisma.flowAccessRequest.count({
      where: { status: "PENDING" },
    }),

    prisma.user.count({
      where: {
        role: "USER",
        status: "APPROVED",
      },
    }),

    prisma.user.count({
      where: {
        role: { in: ["MANAGER", "ADMIN", "OWNER"] },
        status: "APPROVED",
      },
    }),

    prisma.flow.count({
      where: { status: "ACTIVE" },
    }),

    prisma.nexusClick.count(),

    prisma.nexusConversion.count({
      where: {
        type: "REG",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.count({
      where: {
        type: "DEP",
        status: "APPROVED",
      },
    }),

    prisma.nexusConversion.aggregate({
      where: {
        status: "APPROVED",
      },
      _sum: {
        advertiserAmount: true,
        affiliatePayout: true,
      },
    }),

    prisma.nexusConversion.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        userId: true,
        flowId: true,
        type: true,
        status: true,
        advertiserAmount: true,
        affiliatePayout: true,
        currency: true,
        txId: true,
        clickId: true,
        createdAt: true,
      },
    }),

    prisma.affiliateApplication.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const advertiserRevenue = Number(economics._sum.advertiserAmount || 0);
  const affiliatePayouts = Number(economics._sum.affiliatePayout || 0);
  const grossMargin = advertiserRevenue - affiliatePayouts;
  const marginPercent =
    advertiserRevenue > 0 ? grossMargin / advertiserRevenue : 0;

  const recentUserIds = Array.from(
    new Set(recentConversions.map((row) => row.userId)),
  );

  const recentFlowIds = Array.from(
    new Set(recentConversions.map((row) => row.flowId)),
  );

  const [recentUsers, recentFlows] = await Promise.all([
    recentUserIds.length
      ? prisma.user.findMany({
          where: { id: { in: recentUserIds } },
          select: {
            id: true,
            name: true,
            email: true,
            tier: true,
          },
        })
      : [],

    recentFlowIds.length
      ? prisma.flow.findMany({
          where: { id: { in: recentFlowIds } },
          select: {
            id: true,
            name: true,
            trafficSource: true,
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
      : [],
  ]);

  const userById = new Map(recentUsers.map((row) => [row.id, row]));
  const flowById = new Map(recentFlows.map((row) => [row.id, row]));

  const affiliatePerformanceRaw = await prisma.nexusConversion.groupBy({
    by: ["userId"],
    where: {
      status: "APPROVED",
    },
    _count: { _all: true },
    _sum: {
      advertiserAmount: true,
      affiliatePayout: true,
    },
  });

  const affiliateIds = affiliatePerformanceRaw.map((row) => row.userId);

  const affiliateProfiles = affiliateIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: affiliateIds },
        },
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
        },
      })
    : [];

  const affiliateProfileById = new Map(
    affiliateProfiles.map((row) => [row.id, row]),
  );

  const affiliateFtd = affiliateIds.length
    ? await prisma.nexusConversion.groupBy({
        by: ["userId"],
        where: {
          userId: { in: affiliateIds },
          type: "DEP",
          status: "APPROVED",
        },
        _count: { _all: true },
      })
    : [];

  const affiliateFtdById = new Map(
    affiliateFtd.map((row) => [row.userId, row._count._all]),
  );

  const topAffiliates = affiliatePerformanceRaw
    .map((row) => {
      const profile = affiliateProfileById.get(row.userId);
      const revenue = Number(row._sum.advertiserAmount || 0);
      const payout = Number(row._sum.affiliatePayout || 0);

      return {
        id: row.userId,
        name: profile?.name || profile?.email || row.userId,
        email: profile?.email || "",
        tier: profile?.tier ?? null,
        conversions: row._count._all,
        ftd: affiliateFtdById.get(row.userId) || 0,
        revenue,
        payout,
        margin: revenue - payout,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.ftd - a.ftd)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Administration
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Control Center
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Live operational overview powered by NEXUS tracking, conversions,
              partner applications and affiliate access.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/analytics`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              Network Analytics
            </Link>
            <Link
              href={`/${locale}/conversions`}
              className="rounded-xl bg-[#7657ff] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff]"
            >
              Open conversions
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
          <Kpi label="Advertiser revenue" value={money(advertiserRevenue)} accent />
          <Kpi label="Affiliate payouts" value={money(affiliatePayouts)} />
          <Kpi
            label="Gross margin"
            value={money(grossMargin)}
            tone={grossMargin > 0 ? "positive" : grossMargin < 0 ? "negative" : "neutral"}
          />
          <Kpi label="Margin" value={pct(marginPercent)} />
          <Kpi label="Clicks" value={clicks.toLocaleString("en-US")} />
          <Kpi label="REG" value={registrations.toLocaleString("en-US")} />
          <Kpi label="FTD" value={ftd.toLocaleString("en-US")} />
          <Kpi label="Active affiliates" value={affiliates.toLocaleString("en-US")} />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="text-sm font-semibold">Requires attention</div>
              <div className="mt-1 text-xs text-white/35">
                Current operational queues requiring staff review.
              </div>
            </div>

            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Attention
                label="Pending registrations"
                value={pendingRegistrations}
                href={`/${locale}/admin/registrations`}
              />
              <Attention
                label="Access requests"
                value={pendingAccessRequests}
                href={`/${locale}/admin/requests`}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="text-sm font-semibold">Network snapshot</div>
              <div className="mt-1 text-xs text-white/35">
                Current live records powering the NEXUS workspace.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              <Mini label="Affiliates" value={affiliates} />
              <Mini label="Staff" value={staff} />
              <Mini label="Active flows" value={activeFlows} />
              <Mini label="Conversions" value={recentConversions.length ? "Live" : "0"} />
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">Recent conversions</div>
                <div className="mt-1 text-xs text-white/35">
                  Latest attributed NEXUS conversion events.
                </div>
              </div>

              <Link
                href={`/${locale}/conversions`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                View all
              </Link>
            </div>

            {recentConversions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[930px] text-left text-xs">
                  <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                    <tr>
                      <th className="px-5 py-3">When</th>
                      <th>Affiliate</th>
                      <th>Brand / Flow</th>
                      <th>Event</th>
                      <th>Advertiser</th>
                      <th>Affiliate</th>
                      <th>Margin</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.055]">
                    {recentConversions.map((conversion) => {
                      const user = userById.get(conversion.userId);
                      const flow = flowById.get(conversion.flowId);
                      const advertiser = Number(conversion.advertiserAmount || 0);
                      const payout = Number(conversion.affiliatePayout || 0);
                      const margin = advertiser - payout;

                      return (
                        <tr key={conversion.id} className="text-white/58 hover:bg-white/[0.018]">
                          <td className="px-5 py-4 whitespace-nowrap">
                            {dateTime(conversion.createdAt)}
                          </td>
                          <td>
                            <div className="font-medium text-white/78">
                              {user?.name || user?.email || conversion.userId}
                            </div>
                            <div className="mt-1 text-[10px] text-white/25">
                              {user?.email || ""}
                            </div>
                          </td>
                          <td>
                            <div className="font-semibold text-white/80">
                              {flow?.market.brand.name || "Unknown"} / {flow?.name || conversion.flowId}
                            </div>
                            <div className="mt-1 text-[10px] text-white/25">
                              {[flow?.market.geo, flow?.trafficSource].filter(Boolean).join(" / ")}
                            </div>
                          </td>
                          <td>
                            <span className="rounded-md border border-[#7657ff]/25 bg-[#7657ff]/10 px-2 py-1 text-[10px] font-semibold text-[#9a87ff]">
                              {conversion.type === "DEP" ? "FTD / DEP" : conversion.type}
                            </span>
                          </td>
                          <td>{money(advertiser)}</td>
                          <td>{money(payout)}</td>
                          <td className={margin > 0 ? "text-emerald-300" : margin < 0 ? "text-red-300" : ""}>
                            {money(margin)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="No NEXUS conversions yet." />
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="text-sm font-semibold">Top affiliates</div>
              <div className="mt-1 text-xs text-white/35">
                Ranked by advertiser revenue.
              </div>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {topAffiliates.map((affiliate, index) => (
                <Link
                  key={affiliate.id}
                  href={`/${locale}/admin/analytics?affiliateId=${encodeURIComponent(affiliate.id)}`}
                  className="block p-4 transition hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-white/25">
                          #{index + 1}
                        </span>
                        <span className="truncate text-sm font-semibold text-white/82">
                          {affiliate.name}
                        </span>
                      </div>
                      <div className="mt-1 truncate text-[10px] text-white/28">
                        {affiliate.email}
                        {affiliate.tier == null ? "" : ` · Tier ${affiliate.tier}`}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-white/88">
                        {money(affiliate.revenue)}
                      </div>
                      <div className="mt-1 text-[10px] text-emerald-300/80">
                        {money(affiliate.margin)} margin
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-4 text-[10px] text-white/30">
                    <span>{affiliate.ftd} FTD</span>
                    <span>{affiliate.conversions} conv.</span>
                    <span>{money(affiliate.payout)} payout</span>
                  </div>
                </Link>
              ))}

              {!topAffiliates.length ? (
                <Empty text="No affiliate conversion activity yet." />
              ) : null}
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Recent registrations</div>
              <div className="mt-1 text-xs text-white/35">
                Latest partner applications entering the NEXUS review queue.
              </div>
            </div>

            <Link
              href={`/${locale}/admin/registrations`}
              className="text-xs font-semibold text-[#8f7aff]"
            >
              Review all
            </Link>
          </div>

          <div className="divide-y divide-white/[0.055]">
            {recentApps.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white/82">
                    {application.user.name || application.user.email}
                  </div>
                  <div className="mt-1 truncate text-xs text-white/30">
                    {application.user.email}
                  </div>
                </div>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    application.status === "PENDING"
                      ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                      : application.status === "APPROVED"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : "border-red-500/20 bg-red-500/10 text-red-300"
                  }`}
                >
                  {application.status}
                </span>
              </div>
            ))}

            {!recentApps.length ? <Empty text="No partner applications yet." /> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/32">
        {label}
      </div>
      <div
        className={`mt-3 text-[22px] font-semibold tracking-[-0.03em] ${
          tone === "positive"
            ? "text-emerald-300"
            : tone === "negative"
              ? "text-red-300"
              : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] text-white/22">Live NEXUS data</div>
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="text-xs text-white/38">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white/88">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </div>
    </div>
  );
}

function Attention({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-[#7657ff]/30 hover:bg-white/[0.03]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-white/68">{label}</span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            value
              ? "bg-amber-400/10 text-amber-300"
              : "bg-emerald-400/10 text-emerald-300"
          }`}
        >
          {value}
        </span>
      </div>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="p-8 text-center text-sm text-white/30">{text}</div>;
}