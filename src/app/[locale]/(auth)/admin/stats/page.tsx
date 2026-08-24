import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OwnerPerformanceChart from "@/app/components/OwnerPerformanceChart";

export const dynamic = "force-dynamic";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function percent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(
    2,
  )}%`;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function OwnerDashboard({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const role = String(
    (session?.user as any)?.role || "",
  );

  if (
    !session?.user ||
    !["OWNER", "ADMIN"].includes(role)
  ) {
    redirect(`/${locale}`);
  }

  const [
    clicks,
    registrations,
    ftd,
    funnelEvents,
    economics,
    recentConversions,
    flowEconomics,
    flowFtd,
    flowClicks,
  ] = await Promise.all([
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

    prisma.nexusConversion.findMany({
      where: {
        type: {
          in: ["REG", "DEP"],
        },
        status: "APPROVED",
      },
      select: {
        clickId: true,
        type: true,
      },
      take: 50000,
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
      take: 7,
      select: {
        id: true,
        userId: true,
        flowId: true,
        type: true,
        status: true,
        advertiserAmount: true,
        affiliatePayout: true,
        currency: true,
        createdAt: true,
      },
    }),

    prisma.nexusConversion.groupBy({
      by: ["flowId"],
      where: {
        status: "APPROVED",
      },
      _count: { _all: true },
      _sum: {
        advertiserAmount: true,
        affiliatePayout: true,
      },
    }),

    prisma.nexusConversion.groupBy({
      by: ["flowId"],
      where: {
        type: "DEP",
        status: "APPROVED",
      },
      _count: { _all: true },
    }),

    prisma.nexusClick.groupBy({
      by: ["flowId"],
      _count: { _all: true },
    }),
  ]);

  const advertiserRevenue = Number(
    economics._sum.advertiserAmount || 0,
  );
  const affiliatePayouts = Number(
    economics._sum.affiliatePayout || 0,
  );
  const grossMargin =
    advertiserRevenue - affiliatePayouts;
  const marginPercent =
    advertiserRevenue > 0
      ? grossMargin / advertiserRevenue
      : 0;
  const registeredClickIds = new Set(
    funnelEvents
      .filter((row) => row.type === "REG")
      .map((row) => row.clickId),
  );

  const linkedFtdClickIds = new Set(
    funnelEvents
      .filter(
        (row) =>
          row.type === "DEP" &&
          registeredClickIds.has(row.clickId),
      )
      .map((row) => row.clickId),
  );

  const regToFtd =
    registeredClickIds.size > 0
      ? linkedFtdClickIds.size /
        registeredClickIds.size
      : 0;

  const recentUserIds = Array.from(
    new Set(
      recentConversions.map(
        (conversion) => conversion.userId,
      ),
    ),
  );

  const recentFlowIds = Array.from(
    new Set(
      recentConversions.map(
        (conversion) => conversion.flowId,
      ),
    ),
  );

  const rankedFlowIds = flowEconomics
    .slice()
    .sort(
      (a, b) =>
        Number(
          b._sum.advertiserAmount || 0,
        ) -
        Number(
          a._sum.advertiserAmount || 0,
        ),
    )
    .slice(0, 6)
    .map((row) => row.flowId);

  const allFlowIds = Array.from(
    new Set([
      ...recentFlowIds,
      ...rankedFlowIds,
    ]),
  );

  const [recentUsers, flows] =
    await Promise.all([
      recentUserIds.length
        ? prisma.user.findMany({
            where: {
              id: {
                in: recentUserIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [],

      allFlowIds.length
        ? prisma.flow.findMany({
            where: {
              id: {
                in: allFlowIds,
              },
            },
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

  const userById = new Map(
    recentUsers.map((row) => [
      row.id,
      row,
    ]),
  );

  const flowById = new Map(
    flows.map((row) => [row.id, row]),
  );

  const ftdByFlow = new Map(
    flowFtd.map((row) => [
      row.flowId,
      row._count._all,
    ]),
  );

  const clicksByFlow = new Map(
    flowClicks.map((row) => [
      row.flowId,
      row._count._all,
    ]),
  );

  const topFlows = flowEconomics
    .map((row) => {
      const flow = flowById.get(row.flowId);
      const revenue = Number(
        row._sum.advertiserAmount || 0,
      );
      const payout = Number(
        row._sum.affiliatePayout || 0,
      );

      return {
        id: row.flowId,
        flow,
        revenue,
        payout,
        margin: revenue - payout,
        ftd:
          ftdByFlow.get(row.flowId) || 0,
        clicks:
          clicksByFlow.get(row.flowId) || 0,
      };
    })
    .sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.ftd - a.ftd,
    )
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1650px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Network overview
            </div>

            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Dashboard
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              The fast view of network performance
              and recent activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/control-center`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              Open Control Center
            </Link>

            <Link
              href={`/${locale}/admin/analytics`}
              className="rounded-xl bg-[#7657ff] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff]"
            >
              Open statistics
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi
            label="Advertiser revenue"
            value={money(
              advertiserRevenue,
            )}
            accent
          />
          <Kpi
            label="FTD"
            value={ftd.toLocaleString("en-US")}
          />
          <Kpi
            label="Registrations"
            value={registrations.toLocaleString(
              "en-US",
            )}
          />
          <Kpi
            label="Clicks"
            value={clicks.toLocaleString("en-US")}
          />
          <Kpi
            label="REG -> FTD"
            value={percent(regToFtd)}
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
          <OwnerPerformanceChart
            locale={locale}
          />

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="text-sm font-semibold">
                Network economics
              </div>
              <div className="mt-1 text-xs text-white/35">
                Current all-time commercial totals.
              </div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              <EconomicsRow
                label="Advertiser revenue"
                value={money(
                  advertiserRevenue,
                )}
              />
              <EconomicsRow
                label="Affiliate payout"
                value={money(
                  affiliatePayouts,
                )}
              />
              <EconomicsRow
                label="Gross margin"
                value={money(grossMargin)}
                positive={grossMargin > 0}
              />
              <EconomicsRow
                label="Margin"
                value={percent(
                  marginPercent,
                )}
                positive={marginPercent > 0}
              />
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  Top performing flows
                </div>
                <div className="mt-1 text-xs text-white/35">
                  Ranked by advertiser revenue.
                </div>
              </div>

              <Link
                href={`/${locale}/admin/analytics`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                All statistics -&gt;
              </Link>
            </div>

            {topFlows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left text-xs">
                  <colgroup>
                    <col className="w-[19%]" />
                    <col className="w-[8%]" />
                    <col className="w-[23%]" />
                    <col className="w-[8%]" />
                    <col className="w-[10%]" />
                    <col className="w-[17%]" />
                    <col className="w-[15%]" />
                  </colgroup>
                  <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                    <tr>
                      <th className="px-5 py-3">
                        Brand
                      </th>
                      <th>GEO</th>
                      <th>Flow</th>
                      <th>FTD</th>
                      <th>Clicks</th>
                      <th>Revenue</th>
                      <th>Margin</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.055]">
                    {topFlows.map((row) => (
                      <tr
                        key={row.id}
                        className="text-white/58"
                      >
                        <td className="truncate px-5 py-4 font-semibold text-white/82">
                          {row.flow?.market.brand
                            .name || "Unknown"}
                        </td>
                        <td>
                          {row.flow?.market.geo ||
                            "-"}
                        </td>
                        <td>
                          <div className="truncate font-medium text-white/72">
                            {row.flow?.name ||
                              row.id}
                          </div>
                          <div className="truncate text-[10px] text-white/25">
                            {row.flow
                              ?.trafficSource ||
                              ""}
                          </div>
                        </td>
                        <td>{row.ftd}</td>
                        <td>{row.clicks}</td>
                        <td>
                          {money(row.revenue)}
                        </td>
                        <td
                          className={
                            row.margin > 0
                              ? "text-emerald-300"
                              : row.margin < 0
                                ? "text-red-300"
                                : ""
                          }
                        >
                          {money(row.margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="No flow performance yet." />
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  Recent conversions
                </div>
                <div className="mt-1 text-xs text-white/35">
                  Latest network conversion events.
                </div>
              </div>

              <Link
                href={`/${locale}/conversions`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                View all -&gt;
              </Link>
            </div>

            {recentConversions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-xs">
                  <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                    <tr>
                      <th className="px-5 py-3">
                        Event
                      </th>
                      <th>Affiliate</th>
                      <th>Brand / Flow</th>
                      <th>Time</th>
                      <th>Revenue</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/[0.055]">
                    {recentConversions.map(
                      (conversion) => {
                        const user =
                          userById.get(
                            conversion.userId,
                          );
                        const flow =
                          flowById.get(
                            conversion.flowId,
                          );

                        return (
                          <tr
                            key={
                              conversion.id
                            }
                            className="text-white/58"
                          >
                            <td className="px-5 py-4">
                              <span className="rounded-md border border-[#7657ff]/25 bg-[#7657ff]/10 px-2 py-1 text-[10px] font-semibold text-[#9a87ff]">
                                {conversion.type ===
                                "DEP"
                                  ? "FTD / DEP"
                                  : conversion.type}
                              </span>
                            </td>
                            <td className="font-medium text-white/78">
                              {user?.name ||
                                user?.email ||
                                conversion.userId}
                            </td>
                            <td>
                              <div className="font-semibold text-white/78">
                                {flow?.market.brand
                                  .name ||
                                  "Unknown"}{" "}
                                /{" "}
                                {flow?.name ||
                                  conversion.flowId}
                              </div>
                              <div className="truncate text-[10px] text-white/25">
                                {[
                                  flow?.market.geo,
                                  flow?.trafficSource,
                                ]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                            </td>
                            <td className="whitespace-nowrap">
                              {dateTime(
                                conversion.createdAt,
                              )}
                            </td>
                            <td>
                              {money(
                                Number(
                                  conversion.advertiserAmount ||
                                    0,
                                ),
                              )}
                            </td>
                            <td>
                              <Status
                                value={
                                  conversion.status
                                }
                              />
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="No conversions yet." />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>

      <div className="mt-3 text-[26px] font-semibold tracking-[-0.035em] text-white">
        {value}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS data
      </div>
    </div>
  );
}

function EconomicsRow({
  label,
  value,
  positive = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/30">
        {label}
      </div>

      <div
        className={`mt-1.5 text-xl font-semibold ${
          positive
            ? "text-emerald-300"
            : "text-white/88"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  const cls =
    value === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "PENDING"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : "border-red-400/20 bg-red-400/10 text-red-300";

  return (
    <span
      className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${cls}`}
    >
      {value}
    </span>
  );
}

function Empty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="px-5 py-12 text-center text-xs text-white/30">
      {text}
    </div>
  );
}