"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type ConvRow = {
  id: string;
  createdAt: string;
  user?: { id: string; email?: string | null; name?: string | null } | null;
  offer?: { id: string; title: string } | null;
  subId?: string | null;     // = ваш subid / click_id
  amount?: number | null;
  currency?: string | null;
  type: string;              // REG/DEP/REBILL/SALE/LEAD/TEST
  txId?: string | null;
};

export default function PostbacksPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const [menuOpen, setMenuOpen] = useState(false);

  const [rows, setRows] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/postbacks/conversions", { cache: "no-store" });
        if (!alive) return;
        if (res.ok) {
          setRows(await res.json());
        } else {
          // демо-данные
          const now = Date.now();
          setRows([
            {
              id: "c1",
              createdAt: new Date(now - 60_000).toISOString(),
              user: { id: "u1", email: "aff@demo.io", name: "Ihor" },
              offer: { id: "o1", title: "Offer Nanffic" },
              subId: "CLICK-123",
              amount: 5,
              currency: "USD",
              type: "REG",
              txId: "ext-abc",
            },
            {
              id: "c2",
              createdAt: new Date(now - 15 * 60_000).toISOString(),
              user: { id: "u1", email: "aff@demo.io", name: "Ihor" },
              offer: { id: "o1", title: "Offer Nanffic" },
              subId: "CLICK-123",
              amount: 20,
              currency: "USD",
              type: "DEP",
              txId: "ext-def",
            },
          ]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const u = (r.user?.email || r.user?.name || "").toLowerCase();
      const o = (r.offer?.title || "").toLowerCase();
      const sub = (r.subId || "").toLowerCase();
      return u.includes(s) || o.includes(s) || sub.includes(s) || r.type.toLowerCase().includes(s);
    });
  }, [rows, q]);

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ⭐ + Estrella */}
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

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Postbacks</h1>

      {/* Объяснение */}
      <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl p-4 space-y-3">
        <p className="text-white/85">
          Постбек — это автоматическое уведомление о конверсии. Пользователь перешёл по офферу → зарегистрировался/внёс депозит →
          рекламодатель шлёт запрос в Estrella. Ниже вы увидите привязку события к вашему трафику по <code>subid / click_id</code>,
          <code> offer_id</code>, сумме и типу события.
        </p>
        <div className="rounded-xl bg-black/40 border border-white/10 p-3 text-sm">
          <div className="mb-1 text-white/70">Ваш примерный URL приёма постбеков:</div>
          <code className="break-all">
         https://your-domain.com/api/postbacks/ingest?click_id={'{click_id}'}&offer_id={'{offer_id}'}&event={'{status}'}&amount={'{amount}'}&currency={'{currency}'}&sub1={'{sub1}'}&tx_id={'{tx_id}'}
        </code>

          <div className="mt-2 text-white/60 text-xs">
            Поддерживаются и <span className="font-medium">POST</span> тела с теми же параметрами.
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {["{click_id}", "{sub1}", "{sub2}", "{offer_id}", "{user_id}", "{amount}", "{currency}", "{status}", "{tx_id}", "{country}", "{ip}", "{ua}"].map((t) => (
            <span key={t} className="inline-flex items-center rounded-xl px-2.5 py-1 border border-white/15 bg-white/8">{t}</span>
          ))}
        </div>
      </div>

      {/* Поиск */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by user, offer, subid/click_id, event"
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
          onClick={() => alert("Soon: send test postback")}
          className="rounded-xl bg-white/10 border border-white/15 px-3 py-2 hover:bg-white/15"
        >
          Send test
        </button>
      </div>

      {/* Таблица конверсий */}
      <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 text-sm text-white/60 border-b border-white/10">
          <div className="col-span-2">Time</div>
          <div className="col-span-2">User</div>
          <div className="col-span-3">Offer</div>
          <div className="col-span-2">subid / click_id</div>
          <div className="col-span-1">Event</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1">Tx</div>
        </div>

        {loading && <div className="px-4 py-6 text-white/60">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="px-4 py-6 text-white/60">No conversions yet</div>
        )}

        <div className="divide-y divide-white/10">
          {filtered.map((r) => (
            <div key={r.id} className="grid grid-cols-12 px-4 py-3 items-center">
              <div className="col-span-2">{new Date(r.createdAt).toLocaleString()}</div>
              <div className="col-span-2 truncate" title={r.user?.email || r.user?.name || r.user?.id}>
                {r.user?.email || r.user?.name || r.user?.id || "—"}
              </div>
              <div className="col-span-3 truncate" title={r.offer?.title || r.offer?.id || "—"}>
                {r.offer?.title || "—"}
              </div>
              <div className="col-span-2 truncate" title={r.subId || "—"}>
                {r.subId || "—"}
              </div>
              <div className="col-span-1">
                <span className={`inline-flex rounded-lg px-2 py-1 text-xs border ${
                  r.type === "DEP" || r.type === "SALE"
                    ? "bg-amber-400/15 border-amber-400/30 text-amber-200"
                    : "bg-sky-400/15 border-sky-400/30 text-sky-200"
                }`}>
                  {r.type}
                </span>
              </div>
              <div className="col-span-1 text-right">{r.amount != null ? `$${r.amount.toFixed(2)}` : "—"}</div>
              <div className="col-span-1 truncate">{r.txId || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}
