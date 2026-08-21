"use client";

import { useEffect, useMemo, useState } from "react";

type StaffRole = "OWNER" | "ADMIN" | "MANAGER";
type ConvType = "REG" | "DEP" | "REBILL" | "SALE" | "LEAD";
type ConvStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVERSED";

type Row = {
  id: string;
  createdAt: string;
  eventAt: string | null;
  updatedAt: string;
  type: ConvType;
  status: ConvStatus;
  source: string;
  txId: string;
  externalId: string | null;
  clickId: string;
  nexusClickId: string;
  currency: string;
  advertiserAmount: number | null;
  affiliatePayout: number;
  grossMargin: number | null;
  marginPercent: number | null;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    tier: number | null;
  };
  flow: {
    id: string;
    name: string;
    trafficSource: string | null;
    approach: string | null;
    geo: string | null;
    brand: { id: string; name: string } | null;
  };
  terms: {
    id: string;
    version: number | null;
  } | null;
};

type Payload = {
  role: StaffRole;
  items: Row[];
};

const TYPES = ["ALL", "REG", "DEP", "REBILL", "SALE", "LEAD"] as const;
const STATUSES = ["ALL", "APPROVED", "PENDING", "REJECTED", "REVERSED"] as const;

function money(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(Number(value))) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function dateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function shortId(value: string | null | undefined) {
  if (!value) return "-";
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-6)}` : value;
}

function statusBadge(status: ConvStatus) {
  const style =
    status === "APPROVED"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : status === "PENDING"
        ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
        : status === "REVERSED"
          ? "border-orange-500/25 bg-orange-500/10 text-orange-300"
          : "border-red-500/25 bg-red-500/10 text-red-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${style}`}
    >
      {status}
    </span>
  );
}

function typeBadge(type: ConvType) {
  return (
    <span className="inline-flex rounded-md border border-[#7657ff]/25 bg-[#7657ff]/10 px-2 py-1 text-[10px] font-semibold text-[#9a87ff]">
      {type === "DEP" ? "FTD / DEP" : type}
    </span>
  );
}

export default function ConversionsPage() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/nexus/conversions", {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setPayload(null);
      setError(data?.error || "Failed to load NEXUS conversions");
      setLoading(false);
      return;
    }

    setPayload(data as Payload);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const showInternal =
    payload?.role === "OWNER" || payload?.role === "ADMIN";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const fromTs = from
      ? new Date(`${from}T00:00:00Z`).getTime()
      : Number.NEGATIVE_INFINITY;
    const toTs = to
      ? new Date(`${to}T23:59:59.999Z`).getTime()
      : Number.POSITIVE_INFINITY;

    return (payload?.items ?? []).filter((row) => {
      if (type !== "ALL" && row.type !== type) return false;
      if (status !== "ALL" && row.status !== status) return false;

      const ts = new Date(row.createdAt).getTime();
      if (Number.isFinite(ts) && (ts < fromTs || ts > toTs)) return false;

      if (!q) return true;

      const haystack = [
        row.flow.brand?.name ?? "",
        row.flow.name,
        row.flow.geo ?? "",
        row.flow.trafficSource ?? "",
        row.user.email ?? "",
        row.user.name ?? "",
        row.txId,
        row.clickId,
        row.source,
        row.terms?.version == null ? "" : `v${row.terms.version}`,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [payload, query, type, status, from, to]);

  const metrics = useMemo(() => {
    const approved = filtered.filter((row) => row.status === "APPROVED");
    const approvedFtd = approved.filter((row) => row.type === "DEP");

    const advertiserRevenue = approved.reduce(
      (sum, row) => sum + Number(row.advertiserAmount ?? 0),
      0,
    );
    const affiliatePayouts = approved.reduce(
      (sum, row) => sum + Number(row.affiliatePayout ?? 0),
      0,
    );
    const grossMargin = advertiserRevenue - affiliatePayouts;
    const marginPercent =
      advertiserRevenue > 0 ? (grossMargin / advertiserRevenue) * 100 : 0;

    return {
      conversions: filtered.length,
      approvedFtd: approvedFtd.length,
      advertiserRevenue,
      affiliatePayouts,
      grossMargin,
      marginPercent,
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-8 md:px-8 lg:px-10">
        <header className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Internal operations
            </div>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.035em]">
              Conversions
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/40">
              Live NEXUS attribution, conversion status and frozen commercial economics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {payload?.role && (
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {payload.role}
              </span>
            )}
            <button
              onClick={() => void load()}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.035] px-4 text-xs font-semibold text-white/70 transition hover:bg-white/[0.06]"
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

        <section
          className={`mb-5 grid gap-3 sm:grid-cols-2 ${
            showInternal ? "xl:grid-cols-6" : "xl:grid-cols-3"
          }`}
        >
          <Metric label="Conversions" value={metrics.conversions.toLocaleString("en-US")} />
          <Metric label="Approved FTD" value={metrics.approvedFtd.toLocaleString("en-US")} />

          {showInternal && (
            <>
              <Metric
                label="Network revenue"
                value={money(metrics.advertiserRevenue)}
                emphasis
              />
              <Metric
                label="Affiliate payouts"
                value={money(metrics.affiliatePayouts)}
              />
              <Metric
                label="Gross margin"
                value={money(metrics.grossMargin)}
                positive={metrics.grossMargin > 0}
              />
              <Metric
                label="Margin"
                value={`${metrics.marginPercent.toFixed(2)}%`}
              />
            </>
          )}
        </section>

        <section className="mb-5 rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_170px_180px_160px_160px_auto]">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search brand, flow, affiliate, click ID, TX ID..."
              className="h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#7357ff]/60"
            />

            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as (typeof TYPES)[number])
              }
              className="h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white/75 outline-none"
            >
              {TYPES.map((value) => (
                <option key={value} value={value}>
                  {value === "DEP" ? "FTD / DEP" : value}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as (typeof STATUSES)[number])
              }
              className="h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white/75 outline-none"
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white/65 outline-none"
            />

            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-[#090b10] px-3 text-xs text-white/65 outline-none"
            />

            <button
              onClick={() => {
                setQuery("");
                setType("ALL");
                setStatus("ALL");
                setFrom("");
                setTo("");
              }}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.025] px-4 text-xs font-semibold text-white/55 hover:bg-white/[0.05]"
            >
              Reset
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-white/35">
              Loading live NEXUS conversions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-white/35">
              No conversions match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className={`w-full text-left text-xs ${
                  showInternal ? "min-w-[1500px]" : "min-w-[1050px]"
                }`}
              >
                <thead className="border-b border-white/[0.07] bg-black/10 text-[9px] uppercase tracking-[0.14em] text-white/30">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Brand / Flow</th>
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    {showInternal && (
                      <th className="px-4 py-3 font-semibold">Advertiser</th>
                    )}
                    <th className="px-4 py-3 font-semibold">Affiliate</th>
                    {showInternal && (
                      <th className="px-4 py-3 font-semibold">Margin</th>
                    )}
                    <th className="px-4 py-3 font-semibold">Affiliate</th>
                    <th className="px-4 py-3 font-semibold">Terms</th>
                    <th className="px-4 py-3 font-semibold">Source / TX</th>
                    <th className="px-4 py-3 font-semibold">Click ID</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.055]">
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="align-top text-white/62 transition hover:bg-white/[0.018]"
                    >
                      <td className="px-4 py-4">
                        <div className="whitespace-nowrap text-white/72">
                          {dateTime(row.createdAt)}
                        </div>
                        {row.eventAt && (
                          <div className="mt-1 text-[10px] text-white/25">
                            Event {dateTime(row.eventAt)}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-white/85">
                          {row.flow.brand?.name ?? "Unknown brand"}
                          <span className="mx-1.5 text-white/20">/</span>
                          {row.flow.name}
                        </div>
                        <div className="mt-1 text-[10px] text-white/30">
                          {[row.flow.geo, row.flow.trafficSource, row.flow.approach]
                            .filter(Boolean)
                            .join(" / ") || row.flow.id}
                        </div>
                      </td>

                      <td className="px-4 py-4">{typeBadge(row.type)}</td>

                      <td className="px-4 py-4">{statusBadge(row.status)}</td>

                      {showInternal && (
                        <td className="px-4 py-4 font-semibold text-white/85">
                          {money(row.advertiserAmount, row.currency)}
                        </td>
                      )}

                      <td className="px-4 py-4 font-semibold text-white/85">
                        {money(row.affiliatePayout, row.currency)}
                      </td>

                      {showInternal && (
                        <td className="px-4 py-4">
                          <div
                            className={
                              Number(row.grossMargin ?? 0) > 0
                                ? "font-semibold text-emerald-300"
                                : "font-semibold text-white/65"
                            }
                          >
                            {money(row.grossMargin, row.currency)}
                          </div>
                          <div className="mt-1 text-[10px] text-white/28">
                            {row.marginPercent == null
                              ? "-"
                              : `${row.marginPercent.toFixed(2)}%`}
                          </div>
                        </td>
                      )}

                      <td className="px-4 py-4">
                        <div className="font-medium text-white/78">
                          {row.user.email || row.user.name || row.user.id}
                        </div>
                        <div className="mt-1 text-[10px] text-white/28">
                          {row.user.tier == null ? "" : `Tier ${row.user.tier}`}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#9a87ff]">
                          {row.terms?.version == null
                            ? "-"
                            : `v${row.terms.version}`}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-white/22">
                          {row.terms ? shortId(row.terms.id) : ""}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-white/72">
                          {row.source}
                        </div>
                        <div
                          className="mt-1 font-mono text-[10px] text-white/30"
                          title={row.txId}
                        >
                          {shortId(row.txId)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div
                          className="font-mono text-[10px] text-white/38"
                          title={row.clickId}
                        >
                          {shortId(row.clickId)}
                        </div>
                        <div
                          className="mt-1 font-mono text-[10px] text-white/20"
                          title={row.id}
                        >
                          conv {shortId(row.id)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {payload?.role === "MANAGER" && (
          <div className="mt-4 rounded-xl border border-amber-500/15 bg-amber-500/[0.045] px-4 py-3 text-xs leading-5 text-amber-200/65">
            MANAGER view hides advertiser revenue and network margin. OWNER or ADMIN access is required for internal economics.
          </div>
        )}
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
          ? "border-[#7657ff]/25 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/32">
        {label}
      </div>
      <div
        className={`mt-3 text-[24px] font-semibold tracking-[-0.025em] ${
          positive ? "text-emerald-300" : "text-white"
        }`}
      >
        {value}
      </div>
      <div className="mt-2 text-[10px] text-white/24">Live NEXUS data</div>
    </div>
  );
}