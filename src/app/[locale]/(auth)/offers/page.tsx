"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState, PageHeader, Panel, Pill } from "@/app/components/NexusPageKit";

type OfferRow = {
  id: string; title: string; tag?: string | null; cpa: number | null; cap: number | null;
  minDeposit?: number | null; holdDays?: number | null; geo: string; vertical: string; tier: number;
  rules?: string | null; notes?: string | null; kpi1?: unknown; kpi2?: unknown;
  kpi1Text?: string | null; kpi2Text?: string | null; mode: "Auto" | "Manual";
  displayStatus: "AVAILABLE" | "REQUESTED" | "IN_PROGRESS";
};

export default function OffersPage() {
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [vertical, setVertical] = useState("All");
  const [geo, setGeo] = useState("All");
  const [working, setWorking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/offers/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setRows(Array.isArray(j?.items) ? j.items : []))
      .finally(() => setLoading(false));
  }, []);

  const verticals = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.vertical))).sort()], [rows]);
  const geos = useMemo(() => ["All", ...Array.from(new Set(rows.map((r) => r.geo))).sort()], [rows]);
  const filtered = useMemo(() => rows.filter((r) => {
    const hay = `${r.title} ${r.tag ?? ""} ${r.geo} ${r.vertical}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (vertical === "All" || r.vertical === vertical) && (geo === "All" || r.geo === geo);
  }), [rows, q, vertical, geo]);

  async function requestOffer(id: string) {
    setWorking(id);
    try {
      const res = await fetch("/api/offers/requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ offerId: id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) return alert(data?.error ?? "Unable to request access");
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, displayStatus: data.status === "IN_PROGRESS" ? "IN_PROGRESS" : "REQUESTED" } : r));
    } finally { setWorking(null); }
  }

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Workspace" title="Offers" subtitle="Live offer catalog filtered by your tier. Internal advertiser economics stay hidden." />
      <div className="space-y-5 p-5 md:p-8">
        <Panel className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px]">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search offers, GEO or vertical" className="h-10 rounded-lg border border-white/[0.08] bg-black/20 px-3 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-[#7657ff]/40" />
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} className="h-10 rounded-lg border border-white/[0.08] bg-[#101014] px-3 text-[13px] text-white/70 outline-none">{verticals.map((v) => <option key={v}>{v}</option>)}</select>
            <select value={geo} onChange={(e) => setGeo(e.target.value)} className="h-10 rounded-lg border border-white/[0.08] bg-[#101014] px-3 text-[13px] text-white/70 outline-none">{geos.map((v) => <option key={v}>{v}</option>)}</select>
          </div>
        </Panel>

        {loading ? <Panel><EmptyState title="Loading live catalog…" /></Panel> : filtered.length === 0 ? <Panel><EmptyState title="No offers match your filters" description="When staff publishes tier-visible offers, they will appear here automatically." /></Panel> : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((r) => <OfferCard key={r.id} row={r} busy={working === r.id} onRequest={() => requestOffer(r.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function OfferCard({ row: r, busy, onRequest }: { row: OfferRow; busy: boolean; onRequest: () => void }) {
  const statusTone = r.displayStatus === "IN_PROGRESS" ? "success" : r.displayStatus === "REQUESTED" ? "warning" : "accent";
  const statusLabel = r.displayStatus === "IN_PROGRESS" ? "Approved" : r.displayStatus === "REQUESTED" ? "Pending" : "Available";
  const fmt = (n?: number | null) => n == null ? "—" : `$${Number(n).toFixed(2)}`;
  const kpi = (t?: string | null, n?: unknown) => t?.trim() || (n == null ? "—" : String(n));
  return (
    <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/[0.14]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-[16px] font-semibold text-white">{r.title}</h2><Pill tone={statusTone}>{statusLabel}</Pill></div>
          <div className="mt-1.5 text-xs text-white/38">{r.vertical} · {r.geo}{r.tag ? ` · ${r.tag}` : ""}</div>
        </div>
        <Pill>Tier {r.tier}</Pill>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="CPA" value={fmt(r.cpa)} /><Mini label="Cap" value={r.cap ?? "—"} /><Mini label="Min deposit" value={fmt(r.minDeposit)} /><Mini label="Hold" value={r.holdDays == null ? "—" : `${r.holdDays}d`} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><Info label="KPI 1" value={kpi(r.kpi1Text, r.kpi1)} /><Info label="KPI 2" value={kpi(r.kpi2Text, r.kpi2)} /></div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
        <span className="text-[11px] text-white/32">{r.mode} access workflow</span>
        {r.displayStatus === "AVAILABLE" ? <button disabled={busy} onClick={onRequest} className="rounded-lg bg-[#7657ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#826cff] disabled:opacity-50">{busy ? "Requesting…" : "Request access"}</button> : <span className="text-xs text-white/45">{r.displayStatus === "REQUESTED" ? "Awaiting review" : "Available in My Offers"}</span>}
      </div>
    </article>
  );
}
function Mini({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-lg border border-white/[0.07] bg-black/15 p-3"><div className="text-[9px] uppercase tracking-[0.13em] text-white/30">{label}</div><div className="mt-1.5 text-[14px] font-semibold text-white/85">{value}</div></div>; }
function Info({ label, value }: { label: string; value: React.ReactNode }) { return <div className="rounded-lg border border-white/[0.07] bg-black/10 px-3 py-2.5"><div className="text-[9px] uppercase tracking-[0.13em] text-white/28">{label}</div><div className="mt-1 text-xs leading-5 text-white/55">{value}</div></div>; }
