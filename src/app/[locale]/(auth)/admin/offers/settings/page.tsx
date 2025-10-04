// src/app/[locale]/(auth)/admin/offers/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Row = {
  id: string;
  title: string;
  cpa: number | null;
  capDaily?: number | null;
  capMonthly?: number | null;
};

export default function OfferSettingsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      // используем уже существующий список админа
      const r = await fetch("/api/admin/offers/list", { cache: "no-store" });
      const j = await r.json();
      setRows(Array.isArray(j?.items) ? j.items : []);
    } catch {
      setMsg("Не удалось загрузить офферы");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function edit(id: string, field: keyof Row, value: string) {
    setRows((s) =>
      s.map((x) =>
        x.id === id
          ? {
              ...x,
              [field]:
                value === ""
                  ? null
                  : Number.isFinite(Number(value))
                  ? Number(value)
                  : (x as any)[field],
            }
          : x
      )
    );
  }

  async function save(row: Row) {
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: row.id,
          cpa: row.cpa,
          capDaily: row.capDaily,
          capMonthly: row.capMonthly,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed");
      setMsg("Сохранено");
      setRows((s) => s.map((x) => (x.id === row.id ? { ...x, ...j.offer } : x)));
    } catch (e: any) {
      setMsg(e?.message || "Ошибка сохранения");
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 space-y-6 text-white/90">
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(true)} className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40">☰</button>
        <span className="font-semibold">Estrella</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold">Настройки офферов</h1>

      {msg && <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">{msg}</div>}

      <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="text-white/70">
            <tr>
              <Th>Title</Th><Th>CPA</Th><Th>Daily Cap</Th><Th>Monthly Cap</Th><Th>Save</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-white/60">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-white/60">Пусто</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <Td>{r.title}</Td>
                  <Td><Inp value={r.cpa ?? 0} onChange={(v)=>edit(r.id,"cpa",v)} /></Td>
                  <Td><Inp value={r.capDaily ?? 0} onChange={(v)=>edit(r.id,"capDaily",v)} /></Td>
                  <Td><Inp value={r.capMonthly ?? 0} onChange={(v)=>edit(r.id,"capMonthly",v)} /></Td>
                  <Td>
                    <button
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15"
                      onClick={() => save(r)}
                    >
                      Save
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NavDrawer open={open} onClose={()=>setOpen(false)} locale={locale} isAdmin />
    </section>
  );
}

function Th({children}:{children:React.ReactNode}){return <th className="px-4 py-3 font-semibold">{children}</th>}
function Td({children}:{children:React.ReactNode}){return <td className="px-4 py-3">{children}</td>}
function Inp({value,onChange}:{value:number;onChange:(v:string)=>void}) {
  return (
    <input
      type="number"
      step="1"
      className="w-28 rounded-lg border border-white/15 bg-zinc-900 px-2 py-1 text-white outline-none"
      value={String(value ?? "")}
      onChange={(e)=>onChange(e.target.value)}
    />
  );
}
