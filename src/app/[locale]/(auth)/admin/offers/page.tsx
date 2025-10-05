"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type AdminOfferRow = {
  id: string;
  title: string;
  geo: string;
  vertical: string;
  cpa: number | null;
  mode: "Auto" | "Manual";
  hidden: boolean;
  cap?: number | null;           // NEW
  minDeposit?: number | null;
  holdDays?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export default function AdminOffersListPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<AdminOfferRow[]>([]);
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

  async function setHidden(offerId: string, hidden: boolean) {
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, hidden }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed");
      setRows((prev) =>
        prev.map((it) => (it.id === offerId ? { ...it, hidden } : it))
      );
    } catch (e: any) {
      setMsg(e?.message || "Не удалось изменить видимость");
    }
  }

  const fmtMoney = (n?: number | null) =>
    n == null ? "—" : `$${Number(n).toFixed(2)}`;

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

      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Offer</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>CPA</Th>
              <Th>Cap</Th>
              <Th>Mode</Th>
              <Th>MinDep</Th>
              <Th>Hold</Th>
              <Th>Hidden</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="p-6 text-white/60">Загрузка…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} className="p-6 text-white/60">Пусто</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <Td className="font-medium">{r.title}</Td>
                  <Td>{r.geo}</Td>
                  <Td>{r.vertical}</Td>
                  <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                  <Td>{r.cap ?? "—"}</Td>
                  <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
                  <Td>{fmtMoney(r.minDeposit)}</Td>
                  <Td>{r.holdDays ?? "—"}</Td>
                  <Td>{r.hidden ? <Badge tone="orange">Yes</Badge> : <Badge tone="green">No</Badge>}</Td>
                  <Td>
                    <button
                      onClick={() => setHidden(r.id, !r.hidden)}
                      className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
                    >
                      {r.hidden ? "Показать" : "Скрыть"}
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
