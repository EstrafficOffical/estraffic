"use client";

import { useEffect, useMemo, useState } from "react";

type OfferFlow = {
  id: string;
  brand: string;
  vertical: string;
  geo: string;
  marketName: string | null;
  name: string;
  trafficSource: string;
  approach: string | null;
  tier: number;
  accessMode: "OPEN" | "APPROVAL_REQUIRED" | "PRIVATE";
  affiliateCpa: string | null;
  currency: string;
  capFtd: number | null;
  minDeposit: string | null;
  validationTiming: string | null;
  fraudHoldDays: number | null;
  accessStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";
};

type Payload = {
  role: "USER" | "MANAGER" | "ADMIN" | "OWNER";
  tier: number;
  flows: OfferFlow[];
};

const input =
  "h-11 rounded-xl border border-white/10 bg-[#090b10] px-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#7357ff]/60";
const card = "rounded-2xl border border-white/10 bg-[#0d0f14]";

function money(value: string | null, currency: string) {
  if (!value) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

function accessLabel(flow: OfferFlow) {
  if (flow.accessStatus === "APPROVED") return "Approved";
  if (flow.accessStatus === "PENDING") return "Pending review";
  if (flow.accessStatus === "REJECTED") return "Request again";
  if (flow.accessStatus === "REVOKED") return "Request again";
  if (flow.accessMode === "OPEN") return "Activate flow";
  return "Request access";
}

export default function OffersPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [geo, setGeo] = useState("ALL");
  const [vertical, setVertical] = useState("ALL");

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/nexus/affiliate/offers", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json?.error || "Failed to load offers");
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const geos = useMemo(
    () => Array.from(new Set((data?.flows ?? []).map((flow) => flow.geo))).sort(),
    [data],
  );

  const verticals = useMemo(
    () => Array.from(new Set((data?.flows ?? []).map((flow) => flow.vertical))).sort(),
    [data],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (data?.flows ?? []).filter((flow) => {
      if (geo !== "ALL" && flow.geo !== geo) return false;
      if (vertical !== "ALL" && flow.vertical !== vertical) return false;
      if (!query) return true;
      return [
        flow.brand,
        flow.vertical,
        flow.geo,
        flow.name,
        flow.trafficSource,
        flow.approach ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [data, search, geo, vertical]);

  async function requestAccess(flow: OfferFlow) {
    if (data?.role !== "USER") return;
    setBusyId(flow.id);
    setError("");

    const response = await fetch("/api/nexus/affiliate/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flowId: flow.id }),
    });
    const json = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      setError(json?.error || "Could not request access");
      return;
    }

    await load();
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-white">
      <div className="mx-auto w-full max-w-[1500px] px-6 py-10 lg:px-10">
        <div className="mb-8">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[#8068ff]">
            Workspace
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">Offers</h1>
          <p className="mt-3 text-sm text-white/45">
            Live NEXUS flow catalog filtered by your tier. Internal advertiser economics stay hidden.
          </p>
        </div>

        {data && data.role !== "USER" && (
          <div className="mb-5 rounded-2xl border border-[#7357ff]/20 bg-[#7357ff]/[0.06] px-4 py-3 text-sm text-white/60">
            Staff preview: you can inspect the affiliate catalog here, but access actions are disabled for staff accounts.
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className={`${card} mb-6 grid gap-3 p-4 lg:grid-cols-[1fr_210px_210px]`}>
          <input
            className={input}
            placeholder="Search brand, GEO, vertical, flow..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select className={input} value={geo} onChange={(event) => setGeo(event.target.value)}>
            <option value="ALL">All GEOs</option>
            {geos.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
          <select className={input} value={vertical} onChange={(event) => setVertical(event.target.value)}>
            <option value="ALL">All verticals</option>
            {verticals.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={`${card} flex min-h-72 items-center justify-center text-sm text-white/40`}>
            Loading live NEXUS offers...
          </div>
        ) : filtered.length === 0 ? (
          <div className={`${card} flex min-h-72 flex-col items-center justify-center px-6 text-center`}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#7357ff]/25 bg-[#7357ff]/10 text-[#8c77ff]">
              N
            </div>
            <div className="text-lg font-semibold">No offers match your filters</div>
            <div className="mt-2 max-w-lg text-sm leading-6 text-white/40">
              Active visible flows for your tier will appear here automatically.
            </div>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((flow) => {
              const approved = flow.accessStatus === "APPROVED";
              const pending = flow.accessStatus === "PENDING";
              const staffPreview = data?.role !== "USER";

              return (
                <article key={flow.id} className={`${card} overflow-hidden`}>
                  <div className="border-b border-white/8 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold">{flow.brand}</h2>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                            {flow.geo}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                            Tier {flow.tier}
                          </span>
                        </div>
                        <div className="mt-2 text-sm font-medium text-white/75">{flow.name}</div>
                        <div className="mt-1 text-xs text-white/35">
                          {flow.trafficSource}{flow.approach ? ` / ${flow.approach}` : ""} / {flow.vertical}
                        </div>
                      </div>

                      <div
                        className={[
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                          approved
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                            : pending
                              ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                              : "border-white/10 bg-white/[0.03] text-white/45",
                        ].join(" ")}
                      >
                        {approved ? "Approved" : pending ? "Pending" : flow.accessMode.replaceAll("_", " ")}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-4">
                    <Metric label="Affiliate CPA" value={money(flow.affiliateCpa, flow.currency)} />
                    <Metric label="Cap FTD" value={flow.capFtd == null ? "-" : String(flow.capFtd)} />
                    <Metric label="Min deposit" value={money(flow.minDeposit, flow.currency)} />
                    <Metric label="Access" value={flow.accessMode.replaceAll("_", " ")} />
                  </div>

                  {(flow.validationTiming || flow.fraudHoldDays != null) && (
                    <div className="border-t border-white/8 px-5 py-4 text-xs leading-6 text-white/40">
                      {flow.validationTiming && <span>Validation: {flow.validationTiming}</span>}
                      {flow.validationTiming && flow.fraudHoldDays != null && <span> / </span>}
                      {flow.fraudHoldDays != null && <span>Fraud hold: {flow.fraudHoldDays} days</span>}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-white/8 px-5 py-4">
                    <div className="text-xs text-white/30">
                      {approved
                        ? "This flow is available in My Offers."
                        : pending
                          ? "Your request is waiting for staff review."
                          : flow.accessMode === "OPEN"
                            ? "Open flow can be activated instantly."
                            : "Approval is required before tracking access is granted."}
                    </div>

                    {staffPreview ? (
                      <button
                        disabled
                        className="h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white/25"
                      >
                        Staff preview
                      </button>
                    ) : approved ? (
                      <button
                        className="h-10 rounded-xl border border-[#7357ff]/30 bg-[#7357ff]/10 px-4 text-sm font-semibold text-[#a291ff]"
                        onClick={() => {
                          window.location.href = window.location.pathname.replace(/\/offers\/?$/, "/offers/mine");
                        }}
                      >
                        Open My Offers
                      </button>
                    ) : pending ? (
                      <button
                        disabled
                        className="h-10 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 text-sm font-semibold text-amber-300/70"
                      >
                        Pending review
                      </button>
                    ) : (
                      <button
                        disabled={busyId === flow.id}
                        className="h-10 rounded-xl bg-[#7357ff] px-4 text-sm font-semibold text-white transition hover:bg-[#826cff] disabled:opacity-40"
                        onClick={() => void requestAccess(flow)}
                      >
                        {busyId === flow.id ? "Saving..." : accessLabel(flow)}
                      </button>
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
    <div className="bg-[#0b0d12] px-4 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">{label}</div>
      <div className="mt-2 text-sm font-semibold text-white/80">{value}</div>
    </div>
  );
}