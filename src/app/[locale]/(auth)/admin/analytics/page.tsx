"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkAreaChart, {
  NetworkMetric,
  NetworkSeriesRow,
} from "@/app/components/NetworkAreaChart";

type OptionAffiliate = {
  id: string;
  name: string | null;
  email: string;
  tier: number;
};

type OptionBrand = {
  id: string;
  name: string;
};

type OptionFlow = {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  geo: string;
  trafficSource: string;
};

type AffiliateRow = {
  affiliateId: string;
  name: string | null;
  email: string;
  tier: number | null;
  clicks: number;
  regs: number;
  ftd: number;
  conversions: number;
  clickToReg: number;
  regToFtd: number;
  advertiserRevenue: number;
  affiliatePayouts: number;
  grossMargin: number;
  marginPercent: number;
};

type FlowRow = {
  flowId: string;
  flowName: string;
  brandId: string | null;
  brandName: string;
  geo: string | null;
  trafficSource: string | null;
  approach: string | null;
  clicks: number;
  regs: number;
  ftd: number;
  conversions: number;
  clickToReg: number;
  regToFtd: number;
  advertiserRevenue: number;
  affiliatePayouts: number;
  grossMargin: number;
  marginPercent: number;
};

type Activity = {
  id: string;
  createdAt: string;
  affiliateId: string;
  affiliate: string;
  email: string | null;
  brand: string;
  geo: string | null;
  flow: string;
  trafficSource: string | null;
  type: string;
  status: string;
  advertiserRevenue: number;
  affiliatePayout: number;
  grossMargin: number;
  currency: string;
  txId: string;
  clickId: string;
};

type Payload = {
  role: "OWNER" | "ADMIN";
  range: {
    from: string;
    to: string;
  };
  metrics: {
    clicks: number;
    conversions: number;
    regs: number;
    ftd: number;
    advertiserRevenue: number;
    affiliatePayouts: number;
    grossMargin: number;
    marginPercent: number;
    epc: number;
  };
  affiliateRows: AffiliateRow[];
  flowRows: FlowRow[];
  series: NetworkSeriesRow[];
  recentActivity: Activity[];
  options: {
    affiliates: OptionAffiliate[];
    brands: OptionBrand[];
    geos: string[];
    flows: OptionFlow[];
    sources: string[];
    events: string[];
  };
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function presetDates(days: number) {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - (days - 1));

  return {
    from: isoDate(from),
    to: isoDate(to),
  };
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function percent(value: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

const metricTabs: Array<{
  key: NetworkMetric;
  label: string;
}> = [
  { key: "advertiserRevenue", label: "Revenue" },
  { key: "ftd", label: "FTD" },
  { key: "regs", label: "Registrations" },
  { key: "clicks", label: "Clicks" },
];

const selectClass =
  "h-11 min-w-0 rounded-xl border border-white/[0.09] bg-[#0b0d12] px-3 text-xs text-white/72 outline-none transition focus:border-[#7657ff]/50";

export default function NetworkAnalyticsPage() {
  const initial = useMemo(() => presetDates(30), []);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [affiliateId, setAffiliateId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [geo, setGeo] = useState("");
  const [source, setSource] = useState("");
  const [flowId, setFlowId] = useState("");
  const [event, setEvent] = useState("");
  const [metric, setMetric] =
    useState<NetworkMetric>("advertiserRevenue");

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const qs = new URLSearchParams({
      from: new Date(
        `${from}T00:00:00.000Z`,
      ).toISOString(),
      to: new Date(
        `${to}T23:59:59.999Z`,
      ).toISOString(),
    });

    if (affiliateId) {
      qs.set("affiliateId", affiliateId);
    }
    if (brandId) qs.set("brandId", brandId);
    if (geo) qs.set("geo", geo);
    if (source) qs.set("source", source);
    if (flowId) qs.set("flowId", flowId);
    if (event) qs.set("event", event);

    const response = await fetch(
      `/api/admin/nexus/analytics?${qs.toString()}`,
      { cache: "no-store" },
    );

    const body = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      setData(null);
      setError(
        body?.error ||
          "Failed to load network statistics",
      );
      setLoading(false);
      return;
    }

    setData(body as Payload);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [
    from,
    to,
    affiliateId,
    brandId,
    geo,
    source,
    flowId,
    event,
  ]);

  const filteredFlows = useMemo(
    () =>
      (data?.options.flows || [])
        .filter(
          (flow) =>
            !brandId || flow.brandId === brandId,
        )
        .filter(
          (flow) => !geo || flow.geo === geo,
        )
        .filter(
          (flow) =>
            !source ||
            flow.trafficSource === source,
        ),
    [data, brandId, geo, source],
  );

  function applyPreset(days: number) {
    const next = presetDates(days);
    setFrom(next.from);
    setTo(next.to);
  }

  function reset() {
    const next = presetDates(30);

    setAffiliateId("");
    setBrandId("");
    setGeo("");
    setSource("");
    setFlowId("");
    setEvent("");
    setFrom(next.from);
    setTo(next.to);
  }

  const metrics = data?.metrics;

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1650px] px-5 py-8 md:px-8 lg:px-10">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Analytics
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Statistics
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Whole-network performance across every
              affiliate, offer and traffic flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => applyPreset(days)}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.025] px-4 text-xs font-semibold text-white/58 transition hover:bg-white/[0.055] hover:text-white"
              >
                {days === 1
                  ? "Today"
                  : `${days}D`}
              </button>
            ))}

            <button
              onClick={() => void load()}
              className="h-10 rounded-xl bg-[#7657ff] px-4 text-xs font-semibold text-white"
            >
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
          <Metric
            label="Advertiser revenue"
            value={money(
              metrics?.advertiserRevenue || 0,
            )}
            emphasis
          />
          <Metric
            label="Affiliate payouts"
            value={money(
              metrics?.affiliatePayouts || 0,
            )}
          />
          <Metric
            label="Gross margin"
            value={money(
              metrics?.grossMargin || 0,
            )}
            positive={
              (metrics?.grossMargin || 0) > 0
            }
          />
          <Metric
            label="Margin"
            value={percent(
              metrics?.marginPercent || 0,
            )}
          />
          <Metric
            label="Clicks"
            value={(
              metrics?.clicks || 0
            ).toLocaleString("en-US")}
          />
          <Metric
            label="REG"
            value={(
              metrics?.regs || 0
            ).toLocaleString("en-US")}
          />
          <Metric
            label="FTD"
            value={(
              metrics?.ftd || 0
            ).toLocaleString("en-US")}
          />
          <Metric
            label="Affiliate EPC"
            value={money(metrics?.epc || 0)}
          />
        </section>

        <section className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-8">
            <select
              value={affiliateId}
              onChange={(e) =>
                setAffiliateId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">
                All affiliates
              </option>
              {(data?.options.affiliates || []).map(
                (affiliate) => (
                  <option
                    key={affiliate.id}
                    value={affiliate.id}
                  >
                    {affiliate.name ||
                      affiliate.email}
                  </option>
                ),
              )}
            </select>

            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setFlowId("");
              }}
              className={selectClass}
            >
              <option value="">All brands</option>
              {(data?.options.brands || []).map(
                (brand) => (
                  <option
                    key={brand.id}
                    value={brand.id}
                  >
                    {brand.name}
                  </option>
                ),
              )}
            </select>

            <select
              value={geo}
              onChange={(e) => {
                setGeo(e.target.value);
                setFlowId("");
              }}
              className={selectClass}
            >
              <option value="">All GEOs</option>
              {(data?.options.geos || []).map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>

            <select
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setFlowId("");
              }}
              className={selectClass}
            >
              <option value="">
                All traffic sources
              </option>
              {(data?.options.sources || []).map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>

            <select
              value={flowId}
              onChange={(e) =>
                setFlowId(e.target.value)
              }
              className={selectClass}
            >
              <option value="">All flows</option>
              {filteredFlows.map((flow) => (
                <option
                  key={flow.id}
                  value={flow.id}
                >
                  {flow.brandName} / {flow.geo} /{" "}
                  {flow.name}
                </option>
              ))}
            </select>

            <select
              value={event}
              onChange={(e) =>
                setEvent(e.target.value)
              }
              className={selectClass}
            >
              <option value="">All events</option>
              {(data?.options.events || [
                "REG",
                "DEP",
                "REBILL",
                "SALE",
                "LEAD",
              ]).map((value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value === "DEP"
                    ? "FTD / DEP"
                    : value}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={from}
              onChange={(e) =>
                setFrom(e.target.value)
              }
              className={selectClass}
            />

            <input
              type="date"
              value={to}
              onChange={(e) =>
                setTo(e.target.value)
              }
              className={selectClass}
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={reset}
              className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/45 hover:bg-white/[0.035]"
            >
              Reset filters
            </button>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-sm font-semibold">
                Performance
              </div>
              <div className="mt-1 text-xs text-white/35">
                Live network performance for the
                selected filters and period.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {metricTabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    setMetric(item.key)
                  }
                  className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                    metric === item.key
                      ? "border-[#7657ff]/45 bg-[#7657ff]/15 text-[#9a87ff]"
                      : "border-white/[0.08] bg-black/10 text-white/40 hover:text-white/70"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 pb-3 pt-3">
            {loading ? (
              <div className="grid h-[320px] place-items-center text-xs text-white/30">
                Loading live network statistics...
              </div>
            ) : (
              <NetworkAreaChart
                series={data?.series || []}
                metric={metric}
                height={320}
              />
            )}
          </div>
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <Breakdown
            title="Performance by affiliate"
            subtitle="Who is producing traffic and margin."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">
                      Affiliate
                    </th>
                    <th>Clicks</th>
                    <th>REG</th>
                    <th>FTD</th>
                    <th>Revenue</th>
                    <th>Payout</th>
                    <th>Margin</th>
                    <th>REG в†’ FTD</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {(data?.affiliateRows || []).map(
                    (row) => (
                      <tr
                        key={row.affiliateId}
                        className="text-white/58"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white/82">
                            {row.name ||
                              row.email}
                          </div>
                          <div className="mt-1 text-[10px] text-white/25">
                            {row.email}
                            {row.tier == null
                              ? ""
                              : ` В· Tier ${row.tier}`}
                          </div>
                        </td>
                        <td>{row.clicks}</td>
                        <td>{row.regs}</td>
                        <td>{row.ftd}</td>
                        <td>
                          {money(
                            row.advertiserRevenue,
                          )}
                        </td>
                        <td>
                          {money(
                            row.affiliatePayouts,
                          )}
                        </td>
                        <td
                          className={
                            row.grossMargin > 0
                              ? "text-emerald-300"
                              : row.grossMargin < 0
                                ? "text-red-300"
                                : ""
                          }
                        >
                          {money(
                            row.grossMargin,
                          )}
                        </td>
                        <td>
                          {percent(
                            row.regToFtd,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {!data?.affiliateRows.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-white/30"
                      >
                        No affiliate activity for
                        these filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Breakdown>

          <Breakdown
            title="Performance by flow"
            subtitle="Offer, GEO and traffic-source economics."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                  <tr>
                    <th className="px-5 py-3">
                      Brand / Flow
                    </th>
                    <th>GEO</th>
                    <th>Source</th>
                    <th>Clicks</th>
                    <th>REG</th>
                    <th>FTD</th>
                    <th>Revenue</th>
                    <th>Margin</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {(data?.flowRows || []).map(
                    (row) => (
                      <tr
                        key={row.flowId}
                        className="text-white/58"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-white/82">
                            {row.brandName} /{" "}
                            {row.flowName}
                          </div>
                        </td>
                        <td>{row.geo || "вЂ”"}</td>
                        <td>
                          {row.trafficSource ||
                            "вЂ”"}
                        </td>
                        <td>{row.clicks}</td>
                        <td>{row.regs}</td>
                        <td>{row.ftd}</td>
                        <td>
                          {money(
                            row.advertiserRevenue,
                          )}
                        </td>
                        <td
                          className={
                            row.grossMargin > 0
                              ? "text-emerald-300"
                              : row.grossMargin < 0
                                ? "text-red-300"
                                : ""
                          }
                        >
                          {money(
                            row.grossMargin,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {!data?.flowRows.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-white/30"
                      >
                        No flow activity for these
                        filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Breakdown>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="text-sm font-semibold">
              Conversion activity
            </div>
            <div className="mt-1 text-xs text-white/35">
              Recent events matching the selected
              filters.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs">
              <thead className="border-b border-white/[0.06] bg-black/10 text-[9px] uppercase tracking-[0.13em] text-white/28">
                <tr>
                  <th className="px-5 py-3">
                    Time
                  </th>
                  <th>Affiliate</th>
                  <th>Brand / Flow</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Advertiser</th>
                  <th>Affiliate</th>
                  <th>Margin</th>
                  <th>Source / TX</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.055]">
                {(data?.recentActivity || []).map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="text-white/58"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        {new Intl.DateTimeFormat(
                          "en-GB",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        ).format(
                          new Date(row.createdAt),
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-white/78">
                          {row.affiliate}
                        </div>
                        <div className="mt-1 text-[10px] text-white/25">
                          {row.email || ""}
                        </div>
                      </td>
                      <td>
                        <div className="font-semibold text-white/80">
                          {row.brand} / {row.flow}
                        </div>
                        <div className="mt-1 text-[10px] text-white/25">
                          {[row.geo, row.trafficSource]
                            .filter(Boolean)
                            .join(" / ")}
                        </div>
                      </td>
                      <td>
                        {row.type === "DEP"
                          ? "FTD / DEP"
                          : row.type}
                      </td>
                      <td>
                        <span
                          className={
                            row.status === "APPROVED"
                              ? "text-emerald-300"
                              : row.status === "PENDING"
                                ? "text-amber-300"
                                : "text-red-300"
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td>
                        {money(
                          row.advertiserRevenue,
                          row.currency,
                        )}
                      </td>
                      <td>
                        {money(
                          row.affiliatePayout,
                          row.currency,
                        )}
                      </td>
                      <td
                        className={
                          row.grossMargin > 0
                            ? "text-emerald-300"
                            : row.grossMargin < 0
                              ? "text-red-300"
                              : ""
                        }
                      >
                        {money(
                          row.grossMargin,
                          row.currency,
                        )}
                      </td>
                      <td>
                        <div className="font-mono text-[10px] text-white/45">
                          {row.trafficSource ||
                            "GENERIC"}
                        </div>
                        <div className="mt-1 max-w-[150px] truncate font-mono text-[9px] text-white/22">
                          {row.txId}
                        </div>
                      </td>
                    </tr>
                  ),
                )}

                {!data?.recentActivity.length ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-white/30"
                    >
                      No conversion activity for
                      these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis = false,
  positive = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        emphasis
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>
      <div
        className={`mt-3 text-[22px] font-semibold tracking-[-0.03em] ${
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

function Breakdown({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="text-sm font-semibold">
          {title}
        </div>
        <div className="mt-1 text-xs text-white/35">
          {subtitle}
        </div>
      </div>
      {children}
    </section>
  );
}