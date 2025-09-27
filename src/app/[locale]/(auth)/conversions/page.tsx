"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Conv = {
  id: string;
  createdAt: string;
  user: { id: string; email: string | null; name: string | null } | null;
  offer: { id: string; title: string } | null;
  subId: string | null;
  amount: number | string | null;
  currency: string | null;
  type?: "REG" | "DEP" | "REBILL" | "SALE" | "LEAD";
  event?: "REG" | "DEP" | "REBILL" | "SALE" | "LEAD";
  txId: string | null;
};

const TYPES = ["ALL", "REG", "DEP", "REBILL", "SALE", "LEAD"] as const;
type TypeFilter = (typeof TYPES)[number];

export default function ConversionsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const [testOpen, setTestOpen] = useState(false);
  const [test, setTest] = useState({
    click_id: "",
    offer_id: "",
    event: "REG",
    amount: "0",
    currency: "USD",
    tx_id: "",
  });
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const onTestChange = (k: keyof typeof test, v: string) =>
    setTest((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/postbacks/conversions", { cache: "no-store" });
        const data = (res.ok ? await res.json() : []) as Conv[];
        if (alive) setRows(data);
      } catch {
        if (alive) setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : 0;
    const toTs = to ? new Date(to).getTime() + 24 * 3600 * 1000 - 1 : Number.MAX_SAFE_INTEGER;

    return rows.filter((r) => {
      const rowType = (r.type ?? r.event) as TypeFilter | undefined;
      if (type !== "ALL" && rowType !== type) return false;
      const t = new Date(r.createdAt).getTime();
      if (t < fromTs || t > toTs) return false;
      if (!ql) return true;
      const hay = (
        `${r.offer?.title ?? ""} ${r.offer?.id ?? ""} ${r.user?.email ?? ""} ${r.user?.name ?? ""} ${r.subId ?? ""} ${r.txId ?? ""}`
      ).toLowerCase();
      return hay.includes(ql);
    });
  }, [rows, q, type, from, to]);

  async function sendTestPostback(e: React.FormEvent) {
    e.preventDefault();
    setTestMsg(null);
    const url =
      "/api/postbacks/ingest?" +
      new URLSearchParams({
        click_id: test.click_id,
        offer_id: test.offer_id,
        event: test.event,
        amount: test.amount,
        currency: test.currency,
        tx_id: test.tx_id,
      }).toString();
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data?.ok) {
        setTestMsg("✅ Отправлено: " + data.id);
      } else {
        setTestMsg("⚠️ " + (data?.error ?? "Ошибка"));
      }
    } catch {
      setTestMsg("⚠️ Сеть недоступна");
    }
  }

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-8 space-y-8 text-white/90">
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

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">Conversions</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (offer, email, subid, txid)…"
              className="w-full rounded-xl px-10 py-3 outline-none bg-zinc-900 text-white placeholder:text-white/50 border border-white/15 backdrop-blur-xl focus:ring-2 focus:ring-white/20"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">🔎</span>
          </div>
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TypeFilter)}
          className="rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-3 outline-none focus:ring-2 focus:ring-white/20"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-3 outline-none focus:ring-2 focus:ring-white/20"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-3 outline-none focus:ring-2 focus:ring-white/20"
        />
      </div>

      {/* тестовый постбек (можно скрывать по флажку env) */}
      <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl p-4">
        <button
          className="text-sm text-white/80 underline underline-offset-4"
          onClick={() => setTestOpen((v) => !v)}
        >
          {testOpen ? "Скрыть" : "Показать"} форму тестового постбека
        </button>
        {testOpen && (
          <form onSubmit={sendTestPostback} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="click_id" value={test.click_id} onChange={(v) => onTestChange("click_id", v)} />
            <Input label="offer_id" value={test.offer_id} onChange={(v) => onTestChange("offer_id", v)} />
            <div>
              <label className="block text-sm mb-1 text-white/80">event</label>
              <select
                value={test.event}
                onChange={(e) => onTestChange("event", e.target.value)}
                className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
              >
                <option>REG</option>
                <option>DEP</option>
                <option>SALE</option>
                <option>REBILL</option>
                <option>LEAD</option>
              </select>
            </div>
            <Input label="amount" type="number" value={test.amount} onChange={(v) => onTestChange("amount", v)} />
            <Input label="currency" value={test.currency} onChange={(v) => onTestChange("currency", v)} />
            <Input label="tx_id" value={test.tx_id} onChange={(v) => onTestChange("tx_id", v)} />
            <div className="md:col-span-3 flex items-center gap-3">
              <button className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15" type="submit">
                Отправить тестовый постбек
              </button>
              {testMsg && <span className="text-sm text-white/70">{testMsg}</span>}
            </div>
          </form>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr className="text-left">
              <Th>Time</Th>
              <Th>Offer</Th>
              <Th>Type</Th>
              <Th>Amount</Th>
              <Th>Currency</Th>
              <Th>SubID</Th>
              <Th>TxID</Th>
              <Th>User</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-white/60">Загрузка…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-white/60">Пока пусто</td></tr>
            ) : (
              filtered.map((r) => {
                const rowType = r.type ?? r.event ?? "—";
                const amountStr = r.amount != null ? "$" + Number(r.amount).toFixed(2) : "—";
                return (
                  <tr key={r.id} className="border-t border-white/10">
                    <Td>{new Date(r.createdAt).toLocaleString()}</Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.offer?.title ?? "—"}</span>
                        <span className="text-white/50 text-xs">{r.offer?.id}</span>
                      </div>
                    </Td>
                    <Td><Badge>{rowType}</Badge></Td>
                    <Td>{amountStr}</Td>
                    <Td>{r.currency ?? "—"}</Td>
                    <Td className="font-mono">{r.subId ?? "—"}</Td>
                    <Td className="font-mono">{r.txId ?? "—"}</Td>
                    <Td>{r.user?.email ?? r.user?.name ?? "—"}</Td>
                  </tr>
                );
              })
            )}
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
function Badge({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-lg px-2 py-1 text-xs bg-white/10 border border-white/15">{children}</span>;
}
function Input(props: { label: string; value: string; onChange: (v: string) => void; type?: string; }) {
  return (
    <div>
      <label className="block text-sm mb-1 text-white/80">{props.label}</label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
      />
    </div>
  );
}
