"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";
import OffersTable, { OfferRow } from "@/app/components/OffersTable";

export default function OffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<OfferRow[]>([]);

  // дебаунс запросов к API
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // грузим с сервера (реальная БД через Prisma)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const url = `/api/offers?query=${encodeURIComponent(debounced)}&page=1&perPage=50`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        const mapped: OfferRow[] = (data?.items ?? []).map((o: any) => ({
          id: String(o.id),
          name: o.title,
          tag: o.tag ?? undefined,
          cpa: Number(o.cpa ?? 0),
          geo: String(o.geo ?? "US"),
          vertical: String(o.vertical ?? "Gaming"),
          kpi1: Number(o.kpi1 ?? 0),
          kpi2: Number(o.kpi2 ?? 0),
          mode: (o.mode ?? "Auto") as "Auto" | "Manual",
        }));

        if (alive) setRows(mapped);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [debounced]);

  // Если хочешь оставить локальную фильтрацию — раскомментируй и подменяй rows -> filtered
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.geo.toLowerCase().includes(q) ||
        r.vertical.toLowerCase().includes(q)
    );
  }, [rows, query]);

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* твоя звезда + Estrella */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Offers</h1>

      {/* поиск — ЧЁРНЫЙ */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search offers"
              className="w-full rounded-xl px-10 py-3 outline-none
                         bg-zinc-900 text-white caret-white
                         placeholder:text-white/50
                         border border-white/15 backdrop-blur-xl
                         focus:ring-2 focus:ring-white/20"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
          </div>
        </div>

        <button
          className="px-3 py-2 rounded-xl bg-white/8 border border-white/15 backdrop-blur-xl hover:bg-white/10"
          onClick={() => alert("Filters — заглушка")}
        >
          Filters
        </button>
      </div>

      <OffersTable rows={filtered} loading={loading} />

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
