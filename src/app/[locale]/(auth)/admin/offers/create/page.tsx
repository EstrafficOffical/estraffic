// src/app/[locale]/admin/offers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type AdminOffer = {
  id: string;
  title: string;
  cpa: number | null;
  geo: string;
  vertical: string;
  mode: "Auto" | "Manual";
  status: "ACTIVE" | "ARCHIVED" | "PAUSED";
  hidden: boolean;
  createdAt: string;
};

export default function AdminOffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<AdminOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // загрузка списка (админ видит и скрытые)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const r = await fetch("/api/admin/offers/list", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setRows(Array.isArray(j?.items) ? j.items : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      `${r.title} ${r.geo} ${r.vertical} ${r.status}`.toLowerCase().includes(s)
    );
  }, [rows, q]);

  // тумблер скрыть/показать
  async function setHidden(offerId: string, hidden: boolean) {
    const r = await fetch("/api/admin/offers/hide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, hidden }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) {
      alert(j?.error ?? "Failed");
      return;
    }
    setRows(s => s.map(x => (x.id === offerId ? { ...x, hidden } : x)));
  }

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 space-y-6 text-white/90">
      {/* шапка */}
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

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Admin · Offers</h1>

      {/* поиск */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search (title, geo, vertical, status)…"
            className="w-full rounded-xl px-10 py-3 outline-none bg-zinc-900 text-white placeholder:text-white/50 border border-white/15 backdrop-blur-xl focus:ring-2 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        </div>
      </div>

      {/* таблица */}
      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Offer</Th>
              <Th>CPA</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>Mode</Th>
              <Th>Status</Th>
              <Th>Hidden</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-white/60">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-white/60">No offers</td></tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="border-t border-white/10">
                  <Td className="font-medium">{r.title}</Td>
                  <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                  <Td>{r.geo}</Td>
                  <Td>{r.vertical}</Td>
                  <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
                  <Td><Badge tone={r.status === "ACTIVE" ? "green" : r.status === "PAUSED" ? "orange" : "default"}>{r.status}</Badge></Td>
                  <Td>{r.hidden ? <Badge tone="orange">hidden</Badge> : <Badge tone="green">visible</Badge>}</Td>
                  <Td>
                    <button
                      onClick={() => setHidden(r.id, !r.hidden)}
                      className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
                    >
                      {r.hidden ? "Show" : "Hide"}
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} isAdmin />
    </section>
  );
}

/* ——— UI утилиты ——— */
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className ?? ""}`}>{children}</td>;
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
