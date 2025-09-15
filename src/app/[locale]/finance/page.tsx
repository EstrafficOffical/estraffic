"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Wallet = {
  id: string;
  label: string;       // TRC20 / ERC20 / BTC ...
  address: string;
  verified: boolean;
  isPrimary: boolean;
};

type Payout = {
  id: string;
  date: string;        // ISO
  amount: number;
  status: "Paid" | "Pending" | "Rejected";
  txHash?: string | null;
};

export default function FinancePage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);

  const [available, setAvailable] = useState(0);
  const [pending, setPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const [sumRes, wRes, pRes] = await Promise.all([
          fetch("/api/finance/summary"),
          fetch("/api/wallets/list"),
          fetch("/api/payouts/list"),
        ]);

        if (sumRes.ok) {
          const s = await sumRes.json();
          if (!alive) return;
          setAvailable(Number(s.available ?? 0));
          setPending(Number(s.pending ?? 0));
          setTotalPaid(Number(s.totalPaid ?? 0));
        } else {
          if (!alive) return;
          setAvailable(1250);
          setPending(300);
          setTotalPaid(5200);
        }

        if (wRes.ok) {
          const ws = (await wRes.json()) as Wallet[];
          if (alive) setWallets(ws);
        } else if (alive) {
          setWallets([
            {
              id: "w1",
              label: "TRC20",
              address: "TQnEjJgdxyz…",
              verified: true,
              isPrimary: true,
            },
            {
              id: "w2",
              label: "ERC20",
              address: "0xFLSnqRFc1Z…",
              verified: true,
              isPrimary: false,
            },
            {
              id: "w3",
              label: "BTC",
              address: "bc1qar0srr7x…",
              verified: false,
              isPrimary: false,
            },
          ]);
        }

        if (pRes.ok) {
          const ps = (await pRes.json()) as Payout[];
          if (alive) setPayouts(ps);
        } else if (alive) {
          setPayouts([
            { id: "p1", date: "2025-04-03", amount: 1000, status: "Paid", txHash: "e3c2fa6…" },
            { id: "p2", date: "2025-03-26", amount: 500, status: "Pending", txHash: null },
            { id: "p3", date: "2025-03-18", amount: 1200, status: "Paid", txHash: "9a81b1…" },
          ]);
        }
      } catch {
        /* демо-данные уже выставлены выше */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Заголовок, как в остальных разделах: ⭐ + Estrella */}
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

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Finance</h1>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard title="Available Balance" value={`$${available.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <KpiCard title="Pending" value={`$${pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
        <KpiCard title="Total Paid" value={`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
      </div>

      {/* Wallets */}
      <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-xl font-semibold">Wallets</h2>
          <button
            onClick={() => alert("Add Wallet — заглушка")}
            className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
          >
            Add Wallet
          </button>
        </div>

        <div className="divide-y divide-white/10">
          {wallets.map((w) => (
            <div key={w.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{w.label}</span>
                  {w.verified ? (
                    <Badge tone="green">Verified</Badge>
                  ) : (
                    <Badge tone="default">Unverified</Badge>
                  )}
                  {w.isPrimary && <Badge tone="blue">Primary</Badge>}
                </div>
                <div className="text-white/70 text-sm mt-1 truncate max-w-[60vw]" title={w.address}>
                  {w.address}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-white/80 hidden sm:block">Set as Primary</label>
                <input
                  type="checkbox"
                  checked={w.isPrimary}
                  onChange={() => alert("Set Primary — заглушка")}
                  className="h-5 w-5 accent-white/70"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payouts */}
      <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-xl font-semibold">Payouts</h2>
          <button
            onClick={() => alert("Request Payout — заглушка")}
            className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
          >
            Request Payout
          </button>
        </div>

        <div className="min-w-full">
          <div className="grid grid-cols-12 px-4 py-2 text-sm text-white/60">
            <div className="col-span-3">Date</div>
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3">TxHash</div>
          </div>

          <div className="divide-y divide-white/10">
            {loading && <div className="px-4 py-6 text-white/60">Loading…</div>}
            {!loading && payouts.length === 0 && (
              <div className="px-4 py-6 text-white/60">No payouts yet</div>
            )}
            {payouts.map((p) => (
              <div key={p.id} className="grid grid-cols-12 px-4 py-3">
                <div className="col-span-3">{new Date(p.date).toLocaleDateString()}</div>
                <div className="col-span-3">${p.amount.toFixed(2)}</div>
                <div className="col-span-3">
                  <Badge tone={p.status === "Paid" ? "green" : p.status === "Pending" ? "orange" : "default"}>
                    {p.status}
                  </Badge>
                </div>
                <div className="col-span-3 truncate">{p.txHash ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl px-4 py-3">
      <div className="text-white/75 text-sm">{title}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "blue" | "orange";
}) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20 text-white/80",
    green: "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/30 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/30 text-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs border ${map[tone]}`}>
      {children}
    </span>
  );
}
