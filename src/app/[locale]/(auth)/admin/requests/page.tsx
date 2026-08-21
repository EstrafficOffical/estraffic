"use client";

import { useEffect, useMemo, useState } from "react";

type Terms = {
  id: string;
  version: number;
  affiliateCpa: string | null;
  advertiserCpa: string | null;
  currency: string;
  capFtd: number | null;
  minDeposit: string | null;
  validationTiming: string | null;
  fraudHoldDays: number | null;
};

type RequestRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  processedAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    telegram: string | null;
    tier: number;
    assignedManagerId: string | null;
  };
  flow: {
    id: string;
    name: string;
    trafficSource: string;
    approach: string | null;
    tier: number;
    accessMode: string;
    market: {
      geo: string;
      name: string | null;
      brand: {
        name: string;
        vertical: string;
      };
    };
    latestTerms: Terms | null;
  };
};

type Payload = {
  role: "OWNER" | "ADMIN" | "MANAGER";
  requests: RequestRow[];
};

const card = "rounded-2xl border border-white/10 bg-[#0d0f14]";
const input =
  "h-11 rounded-xl border border-white/10 bg-[#090b10] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#7357ff]/60";
const primary =
  "inline-flex h-10 items-center justify-center rounded-xl bg-[#7357ff] px-4 text-sm font-semibold text-white transition hover:bg-[#826cff] disabled:cursor-not-allowed disabled:opacity-40";
const secondary =
  "inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.025] px-4 text-sm font-semibold text-white/75 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40";
const danger =
  "inline-flex h-10 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40";

function money(value: string | null, currency = "USD") {
  if (!value) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

function statusBadge(status: string) {
  const styles =
    status === "APPROVED"
      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
      : status === "REJECTED"
        ? "border-red-500/25 bg-red-500/10 text-red-300"
        : "border-amber-500/25 bg-amber-500/10 text-amber-300";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${styles}`}>
      {status}
    </span>
  );
}

export default function AdminAccessRequestsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("PENDING");

  const writable = data?.role === "OWNER" || data?.role === "ADMIN";

  async function load() {
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/nexus/access-requests", {
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(json?.error || "Failed to load access requests");
      setLoading(false);
      return;
    }

    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.requests ?? []).filter((request) => {
      if (status !== "ALL" && request.status !== status) return false;
      if (!query) return true;

      const haystack = [
        request.user.name ?? "",
        request.user.email,
        request.user.telegram ?? "",
        request.flow.market.brand.name,
        request.flow.market.geo,
        request.flow.name,
        request.flow.trafficSource,
        request.flow.approach ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [data, search, status]);

  const counts = useMemo(() => {
    const requests = data?.requests ?? [];
    return {
      pending: requests.filter((request) => request.status === "PENDING").length,
      approved: requests.filter((request) => request.status === "APPROVED").length,
      rejected: requests.filter((request) => request.status === "REJECTED").length,
    };
  }, [data]);

  async function processRequest(requestId: string, decision: "APPROVE" | "REJECT") {
    if (!writable) return;

    setBusyId(requestId);
    setError("");

    const response = await fetch("/api/admin/nexus/access-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, decision }),
    });

    const json = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setError(json?.error || "Could not process request");
      return;
    }

    await load();
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-10 lg:px-10">
        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8068ff]">
            Administration
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">Access Requests</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/45">
            Review live affiliate requests for NEXUS flows. Approval snapshots the current commercial terms version.
          </p>
        </div>

        {data?.role === "MANAGER" && (
          <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200/80">
            MANAGER access is read-only. OWNER or ADMIN approval is required for flow-access decisions.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <Metric label="Pending" value={String(counts.pending)} />
          <Metric label="Approved" value={String(counts.approved)} />
          <Metric label="Rejected" value={String(counts.rejected)} />
        </div>

        <div className={`${card} mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_220px_auto]`}>
          <input
            className={input}
            placeholder="Search affiliate, brand, GEO, flow..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className={input} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="ALL">All statuses</option>
          </select>
          <button className={secondary} onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className={`${card} flex min-h-72 items-center justify-center text-sm text-white/40`}>
            Loading live access requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${card} flex min-h-72 flex-col items-center justify-center px-6 text-center`}>
            <div className="text-lg font-semibold">No access requests</div>
            <div className="mt-2 text-sm text-white/40">
              Matching requests will appear here automatically.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((request) => {
              const terms = request.flow.latestTerms;
              const advertiser = Number(terms?.advertiserCpa ?? NaN);
              const affiliate = Number(terms?.affiliateCpa ?? NaN);
              const margin =
                Number.isFinite(advertiser) && Number.isFinite(affiliate)
                  ? advertiser - affiliate
                  : null;

              return (
                <article key={request.id} className={`${card} overflow-hidden`}>
                  <div className="grid gap-5 border-b border-white/8 p-5 xl:grid-cols-[1.2fr_1.5fr_auto] xl:items-start">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                        Affiliate
                      </div>
                      <div className="mt-2 text-lg font-semibold">{request.user.name || request.user.email}</div>
                      <div className="mt-1 text-sm text-white/45">{request.user.email}</div>
                      {request.user.telegram && (
                        <div className="mt-1 text-xs text-white/30">{request.user.telegram}</div>
                      )}
                      <div className="mt-3 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                        Tier {request.user.tier}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                        Requested flow
                      </div>
                      <div className="mt-2 text-lg font-semibold">
                        {request.flow.market.brand.name} / {request.flow.market.geo} / {request.flow.name}
                      </div>
                      <div className="mt-1 text-sm text-white/45">
                        {request.flow.trafficSource}
                        {request.flow.approach ? ` / ${request.flow.approach}` : ""}
                        {" / "}
                        {request.flow.market.brand.vertical}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                          {request.flow.accessMode.replaceAll("_", " ")}
                        </span>
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
                          Flow tier {request.flow.tier}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {statusBadge(request.status)}
                      <div className="text-xs text-white/30">
                        {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-6">
                    <RequestMetric
                      label="Affiliate CPA"
                      value={money(terms?.affiliateCpa ?? null, terms?.currency)}
                    />
                    <RequestMetric
                      label="Advertiser CPA"
                      value={money(terms?.advertiserCpa ?? null, terms?.currency)}
                    />
                    <RequestMetric
                      label="Gross margin"
                      value={margin == null ? "-" : money(String(margin), terms?.currency)}
                      accent
                    />
                    <RequestMetric
                      label="Cap FTD"
                      value={terms?.capFtd == null ? "-" : String(terms.capFtd)}
                    />
                    <RequestMetric
                      label="Min deposit"
                      value={money(terms?.minDeposit ?? null, terms?.currency)}
                    />
                    <RequestMetric
                      label="Terms version"
                      value={terms ? `v${terms.version}` : "No terms"}
                    />
                  </div>

                  {(terms?.validationTiming || terms?.fraudHoldDays != null) && (
                    <div className="border-t border-white/8 px-5 py-4 text-xs leading-6 text-white/40">
                      {terms.validationTiming && <span>Validation: {terms.validationTiming}</span>}
                      {terms.validationTiming && terms.fraudHoldDays != null && <span> / </span>}
                      {terms.fraudHoldDays != null && <span>Fraud hold: {terms.fraudHoldDays} days</span>}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 px-5 py-4">
                    <div className="text-xs text-white/30">
                      Approval freezes the current terms version on this affiliate-flow access.
                    </div>

                    {request.status === "PENDING" && writable ? (
                      <div className="flex gap-2">
                        <button
                          className={danger}
                          disabled={busyId === request.id}
                          onClick={() => void processRequest(request.id, "REJECT")}
                        >
                          Reject
                        </button>
                        <button
                          className={primary}
                          disabled={busyId === request.id}
                          onClick={() => void processRequest(request.id, "APPROVE")}
                        >
                          {busyId === request.id ? "Saving..." : "Approve access"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm font-semibold text-white/45">
                        {request.status === "APPROVED"
                          ? "Access approved"
                          : request.status === "REJECTED"
                            ? "Request rejected"
                            : "Read only"}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={card + " p-5"}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
    </div>
  );
}

function RequestMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#0b0d12] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className={`mt-2 text-sm font-semibold ${accent ? "text-emerald-300" : "text-white/80"}`}>
        {value}
      </div>
    </div>
  );
}