"use client";

import { useEffect, useMemo, useState } from "react";

type OptionAffiliate = {
  id: string;
  name: string | null;
  email: string;
  tier: number;
};

type OptionBrand = { id: string; name: string };
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

type SeriesRow = {
  day: string;
  clicks: number;
  regs: number;
  ftd: number;
  conversions: number;
  advertiserRevenue: number;
  affiliatePayouts: number;
  grossMargin: number;
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
  range: { from: string; to: string };
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
  series: SeriesRow[];
  recentActivity: Activity[];
  options: {
    affiliates: OptionAffiliate[];
    brands: OptionBrand[];
    geos: string[];
    flows: OptionFlow[];
    sources: string[];
  };
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function presetDates(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}

function money(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function pct(value: number) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function dateTime(value: string) {
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

export default function NetworkAnalyticsPage() {
  const initial = useMemo(() => presetDates(30), []);

  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [affiliateId, setAffiliateId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [geo, setGeo] = useState("");
  const [flowId, setFlowId] = useState("");
  const [source, setSource] = useState("");

  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const qs = new URLSearchParams({
      from: new Date(`${from}T00:00:00Z`).toISOString(),
      to: new Date(`${to}T23:59:59.999Z`).toISOString(),
    });

    if (affiliateId) qs.set("affiliateId", affiliateId);
    if (brandId) qs.set("brandId", brandId);
    if (geo) qs.set("geo", geo);
    if (flowId) qs.set("flowId", flowId);
    if (source) qs.set("source", source);

    const res = await fetch(`/api/admin/nexus/analytics?${qs.toString()}`, {
      cache: "no-store",
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setData(null);
      setError(payload?.error || "Failed to load Network Analytics");
      setLoading(false);
      return;
    }

    setData(payload as Payload);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [from, to, affiliateId, brandId, geo, flowId, source]);

  const chart = useMemo(() => {
    const rows = data?.series ?? [];
    const width = 1000;
    const height = 250;
    const padX = 34;
    const padTop = 20;
    const padBottom = 34;
    const innerWidth = width - padX * 2;
    const innerHeight = height - padTop - padBottom;

    const maxValue = Math.max(
      1,
      ...rows.map((row) => Math.max(row.clicks, row.regs, row.ftd)),
    );

    const point = (value: number, index: number) => {
      const x =
        rows.length <= 1
          ? width / 2
          : padX + (index / (rows.length - 1)) * innerWidth;
      const y = padTop + innerHeight - (value / maxValue) * innerHeight;
      return { x, y };
    };

    const pathFor = (selector: (row: SeriesRow) => number) =>
      rows
        .map((row, index) => {
          const p = point(selector(row), index);
          return `${index === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
        })
        .join(" ");

    return {
      width,
      height,
      padX,
      padTop,
      padBottom,
      innerHeight,
      maxValue,
      clicksPath: pathFor((row) => row.clicks),
      regsPath: pathFor((row) => row.regs),
      ftdPath: pathFor((row) => row.ftd),
      point,
    };
  }, [data]);

  function applyPreset(days: number) {
    const next = presetDates(days);
    setFrom(next.from);
    setTo(next.to);
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1650px] px-5 py-8 md:px-8 lg:px-10">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Administration
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">
              Network Analytics
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              OWNER view of who generated traffic, when it converted, what advertisers owe, what affiliates earn and what margin NEXUS keeps.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[1, 7, 30].map((days) => (
              <button
                key={days}
                onClick={() => applyPreset(days)}
                className="h-10 rounded-xl border border-white/10 bg-white/[0.025] px-4 text-xs font-semibold text-white/58 transition hover:bg-white/[0.055] hover:text-white"
              >
                {days === 1 ? "Today" : `${days} days`}
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

        {error && (
          <div className="mb-5 rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-8">
          <Metric label="Advertiser revenue" value={money(data?.metrics.advertiserRevenue ?? 0)} emphasis />
          <Metric label="Affiliate payouts" value={money(data?.metrics.affiliatePayouts ?? 0)} />
          <Metric label="Gross margin" value={money(data?.metrics.grossMargin ?? 0)} positive={(data?.metrics.grossMargin ?? 0) > 0} />
          <Metric label="Margin" value={pct(data?.metrics.marginPercent ?? 0)} />
          <Metric label="Clicks" value={(data?.metrics.clicks ?? 0).toLocaleString("en-US")} />
          <Metric label="REG" value={(data?.metrics.regs ?? 0).toLocaleString("en-US")} />
          <Metric label="FTD" value={(data?.metrics.ftd ?? 0).toLocaleString("en-US")} />
          <Metric label="Affiliate EPC" value={money(data?.metrics.epc ?? 0)} />
        </section>

        <section className="mb-5 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            <select value={affiliateId} onChange={(e) => setAffiliateId(e.target.value)} className={selectClass}>
              <option value="">All affiliates</option>
              {(data?.options.affiliates ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>

            <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setFlowId(""); }} className={selectClass}>
              <option value="">All brands</option>
              {(data?.options.brands ?? []).map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>

            <select value={geo} onChange={(e) => { setGeo(e.target.value); setFlowId(""); }} className={selectClass}>
              <option value="">All GEOs</option>
              {(data?.options.geos ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <select value={flowId} onChange={(e) => setFlowId(e.target.value)} className={selectClass}>
              <option value="">All flows</option>
              {(data?.options.flows ?? [])
                .filter((flow) => !brandId || flow.brandId === brandId)
                .filter((flow) => !geo || flow.geo === geo)
                .map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.brandName} / {flow.geo} / {flow.name}
                  </option>
                ))}
            </select>

            <select value={source} onChange={(e) => setSource(e.target.value)} className={selectClass}>
              <option value="">All traffic sources</option>
              {(data?.options.sources ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setAffiliateId("");
                setBrandId("");
                setGeo("");
                setFlowId("");
                setSource("");
                const next = presetDates(30);
                setFrom(next.from);
                setTo(next.to);
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/45 hover:bg-white/[0.035]"
            >
              Reset filters
            </button>
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <div className="text-sm font-semibold">Performance over time</div>
            <div className="mt-1 text-xs text-white/35">
              Daily clicks with REG and FTD activity. Hover a day for exact values.
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="py-20 text-center text-xs text-white/30">
                Loading Network Analytics...
              </div>
            ) : !data?.series.length ? (
              <div className="py-20 text-center text-xs text-white/30">
                No network activity in this period.
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-white/[0.05] bg-black/[0.08] px-3 pb-3 pt-4">
                <div className="mb-3 flex flex-wrap items-center gap-4 px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#7657ff]" />
                    Clicks
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    REG
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-300" />
                    FTD
                  </span>
                </div>

                <div className="w-full overflow-x-auto overflow-y-visible">
                  <div className="relative min-w-[760px] overflow-hidden rounded-lg">
                    <svg
                      viewBox={`0 0 ${chart.width} ${chart.height}`}
                      className="h-[280px] w-full overflow-visible"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Network performance over time"
                    >
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                        const y =
                          chart.padTop +
                          chart.innerHeight -
                          chart.innerHeight * ratio;

                        return (
                          <g key={ratio}>
                            <line
                              x1={chart.padX}
                              x2={chart.width - chart.padX}
                              y1={y}
                              y2={y}
                              stroke="rgba(255,255,255,0.055)"
                              strokeWidth="1"
                              vectorEffect="non-scaling-stroke"
                            />
                            <text
                              x={4}
                              y={y + 4}
                              fill="rgba(255,255,255,0.28)"
                              fontSize="11"
                            >
                              {Math.round(chart.maxValue * ratio)}
                            </text>
                          </g>
                        );
                      })}

                      <path
                        d={chart.clicksPath}
                        fill="none"
                        stroke="#7657ff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={chart.regsPath}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d={chart.ftdPath}
                        fill="none"
                        stroke="#fcd34d"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />

                      {data.series.map((row, index) => {
                        const clicks = chart.point(row.clicks, index);
                        const regs = chart.point(row.regs, index);
                        const ftd = chart.point(row.ftd, index);

                        return (
                          <g key={row.day}>
                            <circle
                              cx={clicks.x}
                              cy={clicks.y}
                              r="4"
                              fill="#7657ff"
                              stroke="#0d0f14"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle
                              cx={regs.x}
                              cy={regs.y}
                              r="3"
                              fill="#34d399"
                              stroke="#0d0f14"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />
                            <circle
                              cx={ftd.x}
                              cy={ftd.y}
                              r="3"
                              fill="#fcd34d"
                              stroke="#0d0f14"
                              strokeWidth="2"
                              vectorEffect="non-scaling-stroke"
                            />

                            <rect
                              x={Math.max(0, clicks.x - 14)}
                              y={0}
                              width="28"
                              height={chart.height}
                              fill="transparent"
                            >
                              <title>{`${row.day}
Clicks: ${row.clicks}
REG: ${row.regs}
FTD: ${row.ftd}
Advertiser: ${money(row.advertiserRevenue)}
Affiliate: ${money(row.affiliatePayouts)}
Margin: ${money(row.grossMargin)}`}</title>
                            </rect>
                          </g>
                        );
                      })}

                      {data.series.map((row, index) => {
                        if (
                          index !== 0 &&
                          index !== data.series.length - 1 &&
                          index % Math.max(1, Math.ceil(data.series.length / 6)) !== 0
                        ) {
                          return null;
                        }

                        const p = chart.point(0, index);

                        return (
                          <text
                            key={`label-${row.day}`}
                            x={p.x}
                            y={chart.height - 7}
                            textAnchor={
                              index === 0
                                ? "start"
                                : index === data.series.length - 1
                                  ? "end"
                                  : "middle"
                            }
                            fill="rgba(255,255,255,0.28)"
                            fontSize="10"
                          >
                            {row.day.slice(5)}
                          </text>
                        );
                      })}
                    </svg>

                    <div
                      className="absolute inset-0 z-20 grid"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(1, data.series.length)}, minmax(0, 1fr))`,
                      }}
                    >
                      {data.series.map((row, index) => {
                        const edgeClass =
                          index < Math.max(2, Math.ceil(data.series.length * 0.18))
                            ? "left-1 translate-x-0"
                            : index >= Math.floor(data.series.length * 0.82)
                              ? "right-1 translate-x-0"
                              : "left-1/2 -translate-x-1/2";

                        return (
                          <div
                            key={`hover-${row.day}`}
                            className="group relative h-full cursor-crosshair"
                            aria-label={`${row.day}: ${row.clicks} clicks, ${row.regs} registrations, ${row.ftd} FTD`}
                          >
                            <div className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-white/[0.10] group-hover:block" />

                            <div
                              className={`pointer-events-none absolute top-3 z-30 hidden w-52 rounded-xl border border-white/10 bg-[#111218]/95 p-3 text-[10px] shadow-2xl backdrop-blur-md group-hover:block ${edgeClass}`}
                            >
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="font-semibold text-white/85">{row.day}</span>
                                <span className="text-[9px] uppercase tracking-[0.12em] text-white/25">
                                  Daily
                                </span>
                              </div>

                              <div className="space-y-1 text-white/45">
                                <div className="flex justify-between gap-4">
                                  <span>Clicks</span>
                                  <span className="font-semibold text-[#9a87ff]">{row.clicks}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>REG</span>
                                  <span className="font-semibold text-emerald-300">{row.regs}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span>FTD</span>
                                  <span className="font-semibold text-amber-200">{row.ftd}</span>
                                </div>

                                <div className="mt-2 border-t border-white/[0.07] pt-2">
                                  <div className="flex justify-between gap-4">
                                    <span>Advertiser</span>
                                    <span className="text-white/80">{money(row.advertiserRevenue)}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span>Affiliate</span>
                                    <span className="text-white/80">{money(row.affiliatePayouts)}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span>Margin</span>
                                    <span
                                      className={
                                        row.grossMargin < 0
                                          ? "font-semibold text-red-300"
                                          : row.grossMargin > 0
                                            ? "font-semibold text-emerald-300"
                                            : "text-white/70"
                                      }
                                    >
                                      {money(row.grossMargin)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <DataSection
          title="Performance by affiliate"
          description="Who is sending traffic and how much value each affiliate generates."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-xs">
              <thead className={theadClass}>
                <tr>
                  <th className="px-5 py-3">Affiliate</th>
                  <th>Clicks</th>
                  <th>REG</th>
                  <th>FTD</th>
                  <th>Click → REG</th>
                  <th>REG → FTD</th>
                  <th>Advertiser</th>
                  <th>Affiliate payout</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {(data?.affiliateRows ?? []).map((row) => (
                  <tr
                    key={row.affiliateId}
                    className="text-white/58 transition hover:bg-white/[0.018]"
                  >
                    <td className="px-5 py-4">
                      <button
                        className="text-left"
                        onClick={() => setAffiliateId(row.affiliateId)}
                      >
                        <div className="font-semibold text-white/85">
                          {row.name || row.email}
                        </div>
                        <div className="mt-1 text-[10px] text-white/28">
                          {row.email} {row.tier == null ? "" : `· Tier ${row.tier}`}
                        </div>
                      </button>
                    </td>
                    <td>{row.clicks}</td>
                    <td>{row.regs}</td>
                    <td>{row.ftd}</td>
                    <td>{pct(row.clickToReg)}</td>
                    <td>{pct(row.regToFtd)}</td>
                    <td className="font-semibold text-white/80">{money(row.advertiserRevenue)}</td>
                    <td className="font-semibold text-white/80">{money(row.affiliatePayouts)}</td>
                    <td>
                      <div className={row.grossMargin > 0 ? "font-semibold text-emerald-300" : row.grossMargin < 0 ? "font-semibold text-red-300" : "text-white/60"}>
                        {money(row.grossMargin)}
                      </div>
                      <div className="mt-1 text-[10px] text-white/25">
                        {pct(row.marginPercent)}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.affiliateRows.length && (
                  <tr><td colSpan={9} className="px-5 py-12 text-center text-white/30">No affiliate activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DataSection>

        <div className="h-5" />

        <DataSection
          title="Performance by flow"
          description="Which brand / GEO / flow / traffic source produces revenue and margin."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] text-left text-xs">
              <thead className={theadClass}>
                <tr>
                  <th className="px-5 py-3">Brand / Flow</th>
                  <th>GEO</th>
                  <th>Traffic</th>
                  <th>Clicks</th>
                  <th>REG</th>
                  <th>FTD</th>
                  <th>REG → FTD</th>
                  <th>Advertiser</th>
                  <th>Affiliate payout</th>
                  <th>Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {(data?.flowRows ?? []).map((row) => (
                  <tr
                    key={row.flowId}
                    className="text-white/58 transition hover:bg-white/[0.018]"
                  >
                    <td className="px-5 py-4">
                      <button className="text-left" onClick={() => setFlowId(row.flowId)}>
                        <div className="font-semibold text-white/85">
                          {row.brandName} / {row.flowName}
                        </div>
                        <div className="mt-1 text-[10px] text-white/28">
                          {row.approach || row.flowId}
                        </div>
                      </button>
                    </td>
                    <td>{row.geo || "-"}</td>
                    <td>{row.trafficSource || "-"}</td>
                    <td>{row.clicks}</td>
                    <td>{row.regs}</td>
                    <td>{row.ftd}</td>
                    <td>{pct(row.regToFtd)}</td>
                    <td className="font-semibold text-white/80">{money(row.advertiserRevenue)}</td>
                    <td className="font-semibold text-white/80">{money(row.affiliatePayouts)}</td>
                    <td>
                      <div className={row.grossMargin > 0 ? "font-semibold text-emerald-300" : row.grossMargin < 0 ? "font-semibold text-red-300" : "text-white/60"}>
                        {money(row.grossMargin)}
                      </div>
                      <div className="mt-1 text-[10px] text-white/25">
                        {pct(row.marginPercent)}
                      </div>
                    </td>
                  </tr>
                ))}
                {!data?.flowRows.length && (
                  <tr><td colSpan={10} className="px-5 py-12 text-center text-white/30">No flow activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DataSection>

        <div className="h-5" />

        <DataSection
          title="Recent network activity"
          description="When conversions happened, who generated them and how the economics resolved."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-left text-xs">
              <thead className={theadClass}>
                <tr>
                  <th className="px-5 py-3">When</th>
                  <th>Affiliate</th>
                  <th>Brand / Flow</th>
                  <th>Event</th>
                  <th>Status</th>
                  <th>Advertiser</th>
                  <th>Affiliate</th>
                  <th>Margin</th>
                  <th>TX ID</th>
                  <th>Click ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.055]">
                {(data?.recentActivity ?? []).map((row) => (
                  <tr key={row.id} className="text-white/58 hover:bg-white/[0.018]">
                    <td className="px-5 py-4 whitespace-nowrap">{dateTime(row.createdAt)}</td>
                    <td>
                      <button onClick={() => setAffiliateId(row.affiliateId)} className="text-left">
                        <div className="font-semibold text-white/82">{row.affiliate}</div>
                        <div className="mt-1 text-[10px] text-white/25">{row.email}</div>
                      </button>
                    </td>
                    <td>
                      <div className="font-semibold text-white/80">{row.brand} / {row.flow}</div>
                      <div className="mt-1 text-[10px] text-white/25">
                        {[row.geo, row.trafficSource].filter(Boolean).join(" / ")}
                      </div>
                    </td>
                    <td>{row.type === "DEP" ? "FTD / DEP" : row.type}</td>
                    <td>
                      <span className={row.status === "APPROVED" ? "text-emerald-300" : row.status === "PENDING" ? "text-amber-300" : "text-red-300"}>
                        {row.status}
                      </span>
                    </td>
                    <td>{money(row.advertiserRevenue, row.currency)}</td>
                    <td>{money(row.affiliatePayout, row.currency)}</td>
                    <td className={row.grossMargin > 0 ? "text-emerald-300" : row.grossMargin < 0 ? "text-red-300" : ""}>
                      {money(row.grossMargin, row.currency)}
                    </td>
                    <td className="font-mono text-[10px]" title={row.txId}>{short(row.txId)}</td>
                    <td className="font-mono text-[10px]" title={row.clickId}>{short(row.clickId)}</td>
                  </tr>
                ))}
                {!data?.recentActivity.length && (
                  <tr><td colSpan={10} className="px-5 py-12 text-center text-white/30">No conversion activity.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DataSection>
      </div>
    </div>
  );
}

const selectClass =
  "h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white/70 outline-none transition focus:border-[#7657ff]/55";

const theadClass =
  "border-b border-white/[0.07] bg-black/10 text-[9px] uppercase tracking-[0.14em] text-white/30";

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
    <div className={`rounded-2xl border p-4 ${emphasis ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]" : "border-white/[0.08] bg-[#0d0f14]"}`}>
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/32">{label}</div>
      <div className={`mt-3 text-[22px] font-semibold tracking-[-0.025em] ${positive ? "text-emerald-300" : "text-white"}`}>
        {value}
      </div>
      <div className="mt-2 text-[10px] text-white/24">Live NEXUS data</div>
    </div>
  );
}

function DataSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
      <div className="border-b border-white/[0.07] px-5 py-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-xs text-white/35">{description}</div>
      </div>
      {children}
    </section>
  );
}