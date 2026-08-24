import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ControlCenterPerformanceChart from "@/app/components/ControlCenterPerformanceChart";

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

export default async function ControlCenter({
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
    pendingRegistrations,
    pendingAccessRequests,
    pendingPayoutRequests,
    activeAffiliates,
    ftd,
    economics,
    approvedAccesses,
    recentPayouts,
    recentRegistrations,
    recentAccessRequests,
    recentConversions,
    lastConversion,
  ] = await Promise.all([
    prisma.affiliateApplication.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.flowAccessRequest.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.nexusPayout.count({
      where: {
        status: "REQUESTED",
      },
    }),

    prisma.user.count({
      where: {
        role: "USER",
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

    prisma.flowAccess.findMany({
      where: {
        status: "APPROVED",
        user: {
          role: "USER",
          status: "APPROVED",
        },
      },
      select: {
        id: true,
        userId: true,
        flowId: true,
        termsVersionId: true,
        customCapFtd: true,
        user: {
          select: {
            name: true,
            email: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
        flow: {
          select: {
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
        },
        termsVersion: {
          select: {
            capFtd: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),

    prisma.nexusPayout.findMany({
      orderBy: {
        requestedAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        userId: true,
        amount: true,
        currency: true,
        status: true,
        destinationLabel: true,
        destinationAddress: true,
        requestedAt: true,
      },
    }),

    prisma.affiliateApplication.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            telegram: true,
            tier: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),

    prisma.flowAccessRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 7,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            assignedManager: {
              select: {
                name: true,
              },
            },
          },
        },
        flow: {
          select: {
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
        },
      },
    }),

    prisma.nexusConversion.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        userId: true,
        flowId: true,
        type: true,
        status: true,
        affiliatePayout: true,
        advertiserAmount: true,
        createdAt: true,
      },
    }),

    prisma.nexusConversion.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
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

  const postbackConfigured = Boolean(
    process.env.NEXUS_POSTBACK_SECRET ||
      process.env.POSTBACK_SHARED_SECRET ||
      process.env.SERVER_SECRET,
  );

  const capAccesses = approvedAccesses
    .map((access) => ({
      ...access,
      effectiveCap:
        access.customCapFtd ??
        access.termsVersion?.capFtd ??
        null,
    }))
    .filter(
      (access) =>
        access.effectiveCap != null &&
        access.effectiveCap > 0,
    );

  const capUserIds = Array.from(
    new Set(
      capAccesses.map(
        (access) => access.userId,
      ),
    ),
  );

  const capFlowIds = Array.from(
    new Set(
      capAccesses.map(
        (access) => access.flowId,
      ),
    ),
  );

  const capConversions =
    capUserIds.length && capFlowIds.length
      ? await prisma.nexusConversion.findMany({
          where: {
            userId: {
              in: capUserIds,
            },
            flowId: {
              in: capFlowIds,
            },
            type: "DEP",
            status: "APPROVED",
          },
          select: {
            userId: true,
            flowId: true,
            termsVersionId: true,
          },
          take: 50000,
        })
      : [];

  const ftdByAccess = new Map<
    string,
    number
  >();

  for (const conversion of capConversions) {
    const key = [
      conversion.userId,
      conversion.flowId,
      conversion.termsVersionId || "",
    ].join("|");

    ftdByAccess.set(
      key,
      (ftdByAccess.get(key) || 0) + 1,
    );
  }

  const capRows = capAccesses
    .map((access) => {
      const key = [
        access.userId,
        access.flowId,
        access.termsVersionId || "",
      ].join("|");

      const count =
        ftdByAccess.get(key) || 0;
      const cap = Number(
        access.effectiveCap || 0,
      );
      const progress =
        cap > 0 ? count / cap : 0;

      return {
        id: access.id,
        affiliate:
          access.user.name ||
          access.user.email,
        brand:
          access.flow.market.brand.name,
        geo: access.flow.market.geo,
        flow: access.flow.name,
        source:
          access.flow.trafficSource,
        ftd: count,
        cap,
        progress,
        manager:
          access.user.assignedManager
            ?.name || "Unassigned",
      };
    })
    .sort(
      (a, b) =>
        b.progress - a.progress ||
        b.ftd - a.ftd,
    )
    .slice(0, 12);

  const flowsNearCap = capRows.filter(
    (row) => row.progress >= 0.8,
  ).length;

  const integrationAttention =
    postbackConfigured ? 0 : 1;

  const payoutUserIds = Array.from(
    new Set(
      recentPayouts.map(
        (payout) => payout.userId,
      ),
    ),
  );

  const conversionUserIds = Array.from(
    new Set(
      recentConversions.map(
        (conversion) => conversion.userId,
      ),
    ),
  );

  const conversionFlowIds = Array.from(
    new Set(
      recentConversions.map(
        (conversion) => conversion.flowId,
      ),
    ),
  );

  const [payoutUsers, conversionUsers, conversionFlows] =
    await Promise.all([
      payoutUserIds.length
        ? prisma.user.findMany({
            where: {
              id: {
                in: payoutUserIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              assignedManager: {
                select: {
                  name: true,
                },
              },
            },
          })
        : [],

      conversionUserIds.length
        ? prisma.user.findMany({
            where: {
              id: {
                in: conversionUserIds,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [],

      conversionFlowIds.length
        ? prisma.flow.findMany({
            where: {
              id: {
                in: conversionFlowIds,
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
        : [],
    ]);

  const payoutUserById = new Map(
    payoutUsers.map((row) => [
      row.id,
      row,
    ]),
  );

  const conversionUserById =
    new Map(
      conversionUsers.map((row) => [
        row.id,
        row,
      ]),
    );

  const conversionFlowById =
    new Map(
      conversionFlows.map((row) => [
        row.id,
        row,
      ]),
    );

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1650px]">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Internal operations
            </div>

            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Control Center
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Network economics, operational
              queues, cap health and platform
              status in one command view.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#7657ff]/30 bg-[#7657ff]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a87ff]">
              {role}
            </span>

            <Link
              href={`/${locale}/admin/analytics`}
              className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              Statistics
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi
            label="Network revenue"
            value={money(
              advertiserRevenue,
            )}
            accent
          />
          <Kpi
            label="Affiliate payout"
            value={money(
              affiliatePayouts,
            )}
          />
          <Kpi
            label="Gross margin"
            value={money(grossMargin)}
            positive={grossMargin > 0}
          />
          <Kpi
            label="Margin %"
            value={percent(
              marginPercent,
            )}
            positive={marginPercent > 0}
          />
          <Kpi
            label="FTD"
            value={ftd.toLocaleString("en-US")}
          />
          <Kpi
            label="Active affiliates"
            value={activeAffiliates.toLocaleString(
              "en-US",
            )}
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="text-sm font-semibold">
              Requires attention
            </div>

            <div className="mt-1 text-xs text-white/35">
              Queues and conditions that may require
              a human decision.
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
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
            <Attention
              label="Payout requests"
              value={pendingPayoutRequests}
              href={`/${locale}/admin/payouts`}
            />
            <Attention
              label="Flows near cap"
              value={flowsNearCap}
              href={`/${locale}/admin/control-center#flow-cap-monitor`}
              warning
            />
            <Attention
              label="Integration setup"
              value={integrationAttention}
              href={`/${locale}/postbacks`}
              warning
            />
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
          <ControlCenterPerformanceChart
            locale={locale}
          />

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="border-b border-white/[0.07] px-5 py-4">
              <div className="text-sm font-semibold">
                Integration health
              </div>

              <div className="mt-1 text-xs text-white/35">
                Live state we can verify from the
                current NEXUS backend.
              </div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              <IntegrationRow
                label="Canonical postback"
                detail="/api/nexus/postback"
                status={
                  postbackConfigured
                    ? "Configured"
                    : "Needs setup"
                }
                tone={
                  postbackConfigured
                    ? "good"
                    : "warning"
                }
              />

              <IntegrationRow
                label="Endpoint state"
                detail="Canonical ingest route"
                status="Active"
                tone="good"
              />

              <IntegrationRow
                label="Legacy endpoints"
                detail="Old provider routes"
                status="Disabled"
                tone="neutral"
              />

              <IntegrationRow
                label="Last conversion"
                detail={
                  lastConversion
                    ? dateTime(
                        lastConversion.createdAt,
                      )
                    : "No events yet"
                }
                status={
                  lastConversion
                    ? "Observed"
                    : "No data"
                }
                tone={
                  lastConversion
                    ? "good"
                    : "neutral"
                }
              />
            </div>

            <div className="border-t border-white/[0.07] p-4">
              <Link
                href={`/${locale}/postbacks`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                View integrations -&gt;
              </Link>
            </div>
          </section>
        </div>

        <section
          id="flow-cap-monitor"
          className="mt-5 scroll-mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]"
        >
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div>
              <div className="text-sm font-semibold">
                Flows near cap
              </div>

              <div className="mt-1 text-xs text-white/35">
                FTD progress for approved affiliate
                flows with an active cap.
              </div>
            </div>

            <Link
              href={`/${locale}/admin/offers`}
              className="text-xs font-semibold text-[#8f7aff]"
            >
              All flows -&gt;
            </Link>
          </div>

          {capRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">
                      Affiliate
                    </th>
                    <th>Brand</th>
                    <th>GEO</th>
                    <th>Flow</th>
                    <th>FTD / CAP</th>
                    <th className="min-w-[300px]">
                      Progress
                    </th>
                    <th>Manager</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {capRows.map((row) => (
                    <tr
                      key={row.id}
                      className="text-white/58"
                    >
                      <td className="px-5 py-4 font-semibold text-white/82">
                        {row.affiliate}
                      </td>
                      <td>{row.brand}</td>
                      <td>{row.geo}</td>
                      <td>
                        <div className="font-medium text-white/72">
                          {row.flow}
                        </div>
                        <div className="mt-1 text-[10px] text-white/25">
                          {row.source}
                        </div>
                      </td>
                      <td className="font-semibold text-white/80">
                        {row.ftd} / {row.cap}
                      </td>
                      <td className="pr-6">
                        <CapProgress
                          progress={
                            row.progress
                          }
                        />
                      </td>
                      <td>{row.manager}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No approved affiliate flows with an active FTD cap." />
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div>
              <div className="text-sm font-semibold">
                Recent payout requests
              </div>

              <div className="mt-1 text-xs text-white/35">
                Latest withdrawal activity across the
                network.
              </div>
            </div>

            <Link
              href={`/${locale}/admin/payouts`}
              className="text-xs font-semibold text-[#8f7aff]"
            >
              All payouts -&gt;
            </Link>
          </div>

          {recentPayouts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">
                      Affiliate
                    </th>
                    <th>Amount</th>
                    <th>Wallet / network</th>
                    <th>Requested</th>
                    <th>Manager</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {recentPayouts.map(
                    (payout) => {
                      const user =
                        payoutUserById.get(
                          payout.userId,
                        );

                      return (
                        <tr
                          key={payout.id}
                          className="text-white/58"
                        >
                          <td className="px-5 py-4 font-semibold text-white/82">
                            {user?.name ||
                              user?.email ||
                              payout.userId}
                          </td>
                          <td className="font-semibold text-white/82">
                            {money(
                              Number(
                                payout.amount,
                              ),
                            )}{" "}
                            {payout.currency}
                          </td>
                          <td>
                            <div className="text-white/65">
                              {payout.destinationLabel ||
                                "Wallet"}
                            </div>
                            <div className="mt-1 max-w-[260px] truncate font-mono text-[9px] text-white/25">
                              {
                                payout.destinationAddress
                              }
                            </div>
                          </td>
                          <td className="whitespace-nowrap">
                            {dateTime(
                              payout.requestedAt,
                            )}
                          </td>
                          <td>
                            {user
                              ?.assignedManager
                              ?.name ||
                              "Unassigned"}
                          </td>
                          <td>
                            <Status
                              value={
                                payout.status
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
            <Empty text="No payout requests yet." />
          )}
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
            <div>
              <div className="text-sm font-semibold">
                Recent registrations
              </div>

              <div className="mt-1 text-xs text-white/35">
                New affiliate applications and their
                current review state.
              </div>
            </div>

            <Link
              href={`/${locale}/admin/registrations`}
              className="text-xs font-semibold text-[#8f7aff]"
            >
              All registrations -&gt;
            </Link>
          </div>

          {recentRegistrations.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">
                      Affiliate
                    </th>
                    <th>Telegram</th>
                    <th>Tier</th>
                    <th>Registered</th>
                    <th>Manager</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {recentRegistrations.map(
                    (application) => (
                      <tr
                        key={application.id}
                        className="text-white/58"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white/82">
                            {application.user
                              .name ||
                              application.user
                                .email}
                          </div>
                          <div className="mt-1 text-[10px] text-white/25">
                            {
                              application.user
                                .email
                            }
                          </div>
                        </td>
                        <td>
                          {application.user
                            .telegram || "-"}
                        </td>
                        <td>
                          Tier{" "}
                          {
                            application.user
                              .tier
                          }
                        </td>
                        <td className="whitespace-nowrap">
                          {dateTime(
                            application.createdAt,
                          )}
                        </td>
                        <td>
                          {application.user
                            .assignedManager
                            ?.name ||
                            "Unassigned"}
                        </td>
                        <td>
                          <Status
                            value={
                              application.status
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty text="No registrations yet." />
          )}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  Recent access requests
                </div>

                <div className="mt-1 text-xs text-white/35">
                  Latest flow-access decisions.
                </div>
              </div>

              <Link
                href={`/${locale}/admin/requests`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                All requests -&gt;
              </Link>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {recentAccessRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white/82">
                        {request.user.name ||
                          request.user.email}
                      </div>

                      <div className="mt-1 text-[10px] text-white/28">
                        {
                          request.flow.market
                            .brand.name
                        }{" "}
                        /{" "}
                        {
                          request.flow.market
                            .geo
                        }{" "}
                        / {request.flow.name}
                      </div>

                      <div className="mt-1 text-[10px] text-white/22">
                        Manager:{" "}
                        {request.user
                          .assignedManager?.name ||
                          "Unassigned"}{" "}
                        /{" "}
                        {dateTime(
                          request.createdAt,
                        )}
                      </div>
                    </div>

                    <Status
                      value={request.status}
                    />
                  </div>
                ),
              )}

              {!recentAccessRequests.length ? (
                <Empty text="No access requests yet." />
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-4">
              <div>
                <div className="text-sm font-semibold">
                  Recent conversions
                </div>

                <div className="mt-1 text-xs text-white/35">
                  Latest attributed network events.
                </div>
              </div>

              <Link
                href={`/${locale}/conversions`}
                className="text-xs font-semibold text-[#8f7aff]"
              >
                All conversions -&gt;
              </Link>
            </div>

            <div className="divide-y divide-white/[0.055]">
              {recentConversions.map(
                (conversion) => {
                  const user =
                    conversionUserById.get(
                      conversion.userId,
                    );
                  const flow =
                    conversionFlowById.get(
                      conversion.flowId,
                    );

                  return (
                    <div
                      key={conversion.id}
                      className="grid gap-3 px-5 py-4 sm:grid-cols-[auto_1fr_auto]"
                    >
                      <span className="h-fit rounded-md border border-[#7657ff]/25 bg-[#7657ff]/10 px-2 py-1 text-[9px] font-semibold text-[#9a87ff]">
                        {conversion.type ===
                        "DEP"
                          ? "FTD / DEP"
                          : conversion.type}
                      </span>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white/82">
                          {user?.name ||
                            user?.email ||
                            conversion.userId}
                        </div>

                        <div className="mt-1 text-[10px] text-white/25">
                          {flow?.market.brand
                            .name ||
                            "Unknown"}{" "}
                          /{" "}
                          {flow?.market.geo ||
                            "-"}{" "}
                          /{" "}
                          {flow?.name ||
                            conversion.flowId}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-semibold text-white/72">
                          {money(
                            Number(
                              conversion.advertiserAmount ||
                                0,
                            ),
                          )}
                        </div>

                        <div className="mt-1 text-[10px] text-white/25">
                          {dateTime(
                            conversion.createdAt,
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}

              {!recentConversions.length ? (
                <Empty text="No conversions yet." />
              ) : null}
            </div>
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
  positive = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
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

      <div
        className={`mt-3 text-[26px] font-semibold tracking-[-0.035em] ${
          positive
            ? "text-emerald-300"
            : "text-white"
        }`}
      >
        {value}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS data
      </div>
    </div>
  );
}

function Attention({
  label,
  value,
  href,
  warning = false,
}: {
  label: string;
  value: number;
  href: string;
  warning?: boolean;
}) {
  const active = value > 0;

  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition ${
        active
          ? warning
            ? "border-amber-400/15 bg-amber-400/[0.035] hover:border-amber-400/30"
            : "border-[#7657ff]/15 bg-[#7657ff]/[0.035] hover:border-[#7657ff]/30"
          : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-white/65">
          {label}
        </span>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
            active
              ? warning
                ? "bg-amber-400/10 text-amber-300"
                : "bg-[#7657ff]/12 text-[#9a87ff]"
              : "bg-emerald-400/10 text-emerald-300"
          }`}
        >
          {value}
        </span>
      </div>
    </Link>
  );
}

function IntegrationRow({
  label,
  detail,
  status,
  tone,
}: {
  label: string;
  detail: string;
  status: string;
  tone: "good" | "warning" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-white/78">
          {label}
        </div>

        <div className="mt-1 truncate text-[10px] text-white/28">
          {detail}
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
          tone === "good"
            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
            : tone === "warning"
              ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
              : "border-white/10 bg-white/[0.035] text-white/45"
        }`}
      >
        {status}
      </span>
    </div>
  );
}

function CapProgress({
  progress,
}: {
  progress: number;
}) {
  const percent = Math.max(
    0,
    Math.min(100, progress * 100),
  );
  const reached = progress >= 1;
  const near = progress >= 0.8;

  return (
    <div className="flex min-w-[285px] items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/30">
        <div
          className={`h-full rounded-full transition-all ${
            reached
              ? "bg-red-500"
              : near
                ? "bg-amber-400"
                : "bg-[#7657ff]"
          }`}
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <span
        className={`w-12 text-right text-[11px] font-semibold ${
          reached
            ? "text-red-300"
            : near
              ? "text-amber-300"
              : "text-white/45"
        }`}
      >
        {percent.toFixed(0)}%
      </span>

      {reached ? (
        <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-red-300">
          Cap reached
        </span>
      ) : near ? (
        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-300">
          Near cap
        </span>
      ) : null}
    </div>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  const cls =
    value === "APPROVED" ||
    value === "PAID"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "PENDING" ||
          value === "REQUESTED"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : value === "REJECTED"
          ? "border-red-400/20 bg-red-400/10 text-red-300"
          : "border-white/10 bg-white/[0.035] text-white/45";

  return (
    <span
      className={`h-fit rounded-full border px-2.5 py-1 text-[9px] font-semibold ${cls}`}
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