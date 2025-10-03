"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type MyOffer = {
  id: string;
  title: string;
  cpa: number | null;
  geo: string;
  vertical: string;
  mode: "Auto" | "Manual";
};

export default function MyOffersPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<MyOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/offers/mine", { cache: "no-store" });
        const data = await res.json();
        if (alive) setRows(Array.isArray(data) ? data : data.items ?? []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function complete(offerId: string) {
    const r = await fetch("/api/offers/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.ok) {
      setRows(s => s.filter(x => x.id !== offerId));
    } else {
      alert(j?.error ?? "Failed");
    }
  }

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-6 text-white/90">
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

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">My offers</h1>

      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Offer</Th>
              <Th>CPA</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>Mode</Th>
              <Th>Action</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-white/60">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-white/60">No approved offers yet</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <Td className="font-medium">{r.title}</Td>
                <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                <Td>{r.geo}</Td>
                <Td>{r.vertical}</Td>
                <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
                <Td>
                  <button
                    onClick={() => complete(r.id)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15"
                    title="Скрыть из «Мои офферы»"
                  >
                    Завершить
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

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
