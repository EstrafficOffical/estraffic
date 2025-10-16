"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Summary = {
  clicks: number;
  regs: number;
  deps: number;
  revenue: number; // сумма Conversion.amount
};

type OfferRow = {
  offerId: string;
  title: string;
  clicks: number;
  regs: number;
  deps: number;
  revenue: number;
  users: number; // уникальных вебов
};

type UserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  clicks: number;
  regs: number;
  deps: number;
  revenue: number;
  offers: number; // уникальные офферы
};

function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function AdminStatsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const router = useRouter();
  const sp = useSearchParams();

  // период по умолчанию: последние 30 дней
  const todayISO = new Date().toISOString().slice(0, 10);
  const fromDefault = new Date();
  fromDefault.setDate(fromDefault.getDate() - 30);
  const fromISOdef = fromDefault.toISOString().slice(0, 10);

  const [menuOpen, setMenuOpen] = useState(false);
  const [from, setFrom] = useState(sp.get("from") || fromISOdef);
  const [to, setTo] = useState(sp.get("to") || todayISO);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const qp = useMemo(() => `?from=${from}&to=${to}`, [from, to]);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const [s, o, u] = await Promise.all([
        fetch(`/api/admin/stats/summary${qp}`).then((r) => r.json()),
        fetch(`/api/admin/stats/offers${qp}`).then((r) => r.json()),
        fetch(`/api/admin/stats/users${qp}`).then((r) => r.json()),
      ]);
      if (s.error) throw new Error(s.error);
      if (o.error) throw new Error(o.error);
      if (u.error) throw new Error(u.error);
      setSummary(s);
      setOffers(o.items || []);
      setUsers(u.items || []);
    } catch (e: any) {
      setMsg(e?.message || "Ошибка загрузки статистики");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    router.replace(`${pathname}?from=${from}&to=${to}`);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-8 space-y-6 text-white/90">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          ☰
        </button>
        <span className="font-semibold">Estrella</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold">Статистика (админ)</h1>

      {/* ФИЛЬТРЫ */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-xs mb-1 text-white/70">От</div>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-white outline-none"
          />
        </div>
        <div>
          <div className="text-xs mb-1 text-white/70">До (включ.)</div>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 text-white outline-none"
          />
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15"
        >
          Обновить
        </button>
      </div>

      {msg && <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm">{msg}</div>}

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi title="Клики" value={loading ? "…" : (summary?.clicks ?? 0).toLocaleString()} />
        <Kpi title="Регистрации" value={loading ? "…" : (summary?.regs ?? 0).toLocaleString()} />
        <Kpi title="Депозиты" value={loading ? "…" : (summary?.deps ?? 0).toLocaleString()} />
        <Kpi title="Доход" value={loading ? "…" : fmtMoney(summary?.revenue ?? 0)} />
      </div>

      {/* ТАБЛИЦА ПО ОФФЕРАМ */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">По офферам</h2>
        <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="text-white/70">
              <tr><Th>Offer</Th><Th>Клики</Th><Th>REG</Th><Th>DEP</Th><Th>Веб-мастера</Th><Th>Доход</Th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Нет данных</td></tr>
              ) : (
                offers.map((r) => (
                  <tr key={r.offerId} className="border-t border-white/10">
                    <Td className="font-medium">{r.title}</Td>
                    <Td>{r.clicks.toLocaleString()}</Td>
                    <Td>{r.regs.toLocaleString()}</Td>
                    <Td>{r.deps.toLocaleString()}</Td>
                    <Td>{r.users.toLocaleString()}</Td>
                    <Td>{fmtMoney(r.revenue)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ТАБЛИЦА ПО ПОЛЬЗОВАТЕЛЯМ */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold">По пользователям</h2>
        <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="text-white/70">
              <tr><Th>User</Th><Th>Клики</Th><Th>REG</Th><Th>DEP</Th><Th>Офферы</Th><Th>Доход</Th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Загрузка…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-white/60">Нет данных</td></tr>
              ) : (
                users.map((r) => (
                  <tr key={r.userId} className="border-t border-white/10">
                    <Td className="font-medium">
                      {r.name || r.email || r.userId}
                      <div className="text-xs text-white/50">{r.email}</div>
                    </Td>
                    <Td>{r.clicks.toLocaleString()}</Td>
                    <Td>{r.regs.toLocaleString()}</Td>
                    <Td>{r.deps.toLocaleString()}</Td>
                    <Td>{r.offers.toLocaleString()}</Td>
                    <Td>{fmtMoney(r.revenue)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} isAdmin />
    </section>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/70">{title}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 whitespace-nowrap ${className ?? ""}`}>{children}</td>;
}
