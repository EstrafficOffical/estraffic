"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";
import OffersTable, { OfferRow } from "@/app/components/admin/offers/OffersTable";

export default function AdminOffersListPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/list", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed");
      setRows(Array.isArray(j?.items) ? j.items : []);
    } catch (e: any) {
      setMsg(e?.message || "Ошибка загрузки");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.geo} ${r.vertical}`.toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 space-y-6 text-white/90">
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
        <span className="font-semibold">Estrella</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold">Офферы (админ)</h1>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию, GEO, вертикали…"
            className="w-full rounded-xl px-10 py-3 outline-none bg-zinc-900 text-white placeholder:text-white/50 border border-white/15 backdrop-blur-xl focus:ring-2 focus:ring-white/20"
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
        </div>
        <button
          onClick={load}
          className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg:white/15"
        >
          Обновить
        </button>
      </div>

      {msg && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">
          {msg}
        </div>
      )}

      {loading ? (
        <div className="p-6 text-white/60">Загрузка…</div>
      ) : (
        <OffersTable
          rows={filtered}
          onRowChanged={(id, patch) =>
            setRows((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
          }
          onRowRemoved={(id) => setRows((prev) => prev.filter((x) => x.id !== id))}
        />
      )}

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} isAdmin />
    </section>
  );
}
