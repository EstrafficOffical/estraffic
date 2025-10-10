"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type OfferRow = {
  id: string;
  title: string;
  tag: string | null;
  cpa: number | null;
  cap: number | null;
  geo: string;
  vertical: string;
  kpi1: string | number | null;
  kpi2: string | number | null;
  mode: "Auto" | "Manual";
  requested: boolean;
  approved: boolean;
};

export default function OffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/offers/list", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setRows(Array.isArray(data) ? data : data.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.tag ?? ""} ${r.geo} ${r.vertical}`.toLowerCase().includes(s)
    );
  }, [rows, q]);

  async function requestOffer(offerId: string) {
    const res = await fetch("/api/offers/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId }),
    });
    const data = await res.json();
    if (res.ok && data?.ok) {
      setRows((s) => s.map((r) => (r.id === offerId ? { ...r, requested: true } : r)));
    } else {
      alert(data?.error ?? "Request error");
    }
  }

  const showKpi = (v: string | number | null) =>
    v == null || v === "" ? "—" : String(v);

  return (
    <section className="w-full mx-auto px-4 py-8 space-y-6 text-white/90">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-white/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Offers</h1>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search offers"
            className="w-full rounded-xl px-10 py-3 outline-none bg-zinc-900 text-white placeholder:text-white/50 border border-white/15 backdrop-blur-xl focus:ring-2 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Offer</Th>
              <Th>Tag</Th>
              <Th>CPA</Th>
              <Th>Cap</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>KPI</Th>
              <Th>KPI</Th>
              <Th>Mode</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-6 text-white/60">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-white/60">No offers</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <Td className="font-medium">{r.title}</Td>
                  <Td className="text-white/70">{r.tag ?? "—"}</Td>
                  <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                  <Td>{r.cap ?? "—"}</Td>
                  <Td>{r.geo}</Td>
                  <Td>{r.vertical}</Td>
                  <Td>{showKpi(r.kpi1)}</Td>
                  <Td>{showKpi(r.kpi2)}</Td>
                  <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
                  <Td>
                    {r.approved ? (
                      <Badge tone="green">Approved</Badge>
                    ) : r.requested ? (
                      <Badge tone="orange">Requested</Badge>
                    ) : (
                      <button
                        onClick={() => requestOffer(r.id)}
                        className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
                      >
                        Request
                      </button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 whitespace-nowrap ${className ?? ""}`}>{children}</td>;
}
function Badge({
  children, tone = "default",
}: { children: React.ReactNode; tone?: "default" | "green" | "blue" | "orange" }) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20 text-white/80",
    green: "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/30 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/30 text-amber-200",
  };
  return <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs border ${map[tone]}`}>{children}</span>;
}
