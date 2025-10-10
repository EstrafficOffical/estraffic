"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Row = {
  id: string;
  title: string;
  tag: string | null;
  geo: string;
  vertical: string;
  cpa: number | null;
  cap: number | null;
  kpi1Text: string | null;
  kpi2Text: string | null;
  mode: "Auto" | "Manual";
  targetUrl: string | null;
  status: "ACTIVE" | "ARCHIVED" | "PAUSED";
  hidden: boolean;
};

export default function OfferSettingsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const [open, setOpen] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [editing, setEditing] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/list", { cache: "no-store" });
      const j = await r.json();
      const items: Row[] = (j?.items ?? []).map((x: any) => ({
        ...x,
        tag: x.tag ?? null,
        kpi1Text: x.kpi1Text ?? null,
        kpi2Text: x.kpi2Text ?? null,
        targetUrl: x.targetUrl ?? null,
      }));
      setRows(items);
    } catch (e) {
      setMsg("Не удалось загрузить офферы");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveEdit() {
    if (!editing) return;
    setMsg(null);
    const payload = { offerId: editing.id, ...editing };
    try {
      const r = await fetch("/api/admin/offers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed");
      setRows((s) => s.map((x) => (x.id === editing.id ? { ...x, ...j.offer } : x)));
      setEditing(null);
      setMsg("Сохранено");
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
            <tr className="text-left">
              <Th>Title</Th>
              <Th>Tag</Th>
              <Th>GEO</Th>
              <Th>Vertical</Th>
              <Th>CPA</Th>
              <Th>Cap</Th>
              <Th>Mode</Th>
              <Th>Hidden</Th>
              <Th>Edit</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="p-6 text-white/60">Загрузка…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="p-6 text-white/60">Пусто</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-white/10">
                  <Td>{r.title}</Td>
                  <Td>{r.tag ?? "—"}</Td>
                  <Td>{r.geo}</Td>
                  <Td>{r.vertical}</Td>
                  <Td>{r.cpa == null ? "—" : `$${Number(r.cpa).toFixed(2)}`}</Td>
                  <Td>{r.cap ?? "—"}</Td>
                  <Td>{r.mode}</Td>
                  <Td>{r.hidden ? "yes" : "no"}</Td>
                  <Td>
                    <button
                      className="rounded-xl bg-white/10 border border-white/15 px-3 py-1.5 hover:bg-white/15"
                      onClick={() => setEditing(r)}
                    >
                      Изменить
                    </button>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* editor drawer-like card */}
      {editing && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 space-y-3">
          <h2 className="text-xl font-semibold">Редактировать оффер</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Title">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.title}
                     onChange={(e)=>setEditing({...editing, title:e.target.value})}/>
            </Field>
            <Field label="Tag">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.tag ?? ""} onChange={(e)=>setEditing({...editing, tag:e.target.value})}/>
            </Field>
            <Field label="GEO">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.geo} onChange={(e)=>setEditing({...editing, geo:e.target.value})}/>
            </Field>
            <Field label="Vertical">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.vertical} onChange={(e)=>setEditing({...editing, vertical:e.target.value})}/>
            </Field>
            <Field label="CPA ($)">
              <input type="number" step="0.01"
                     className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.cpa ?? ""} onChange={(e)=>setEditing({...editing, cpa: e.target.value===""?null:Number(e.target.value)})}/>
            </Field>
            <Field label="Cap">
              <input type="number" step="1" min={0}
                     className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.cap ?? ""} onChange={(e)=>setEditing({...editing, cap: e.target.value===""?null:Number(e.target.value)})}/>
            </Field>
            <Field label="KPI1 (text)">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.kpi1Text ?? ""} onChange={(e)=>setEditing({...editing, kpi1Text:e.target.value})}/>
            </Field>
            <Field label="KPI2 (text)">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.kpi2Text ?? ""} onChange={(e)=>setEditing({...editing, kpi2Text:e.target.value})}/>
            </Field>
            <Field label="Mode">
              <select className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                      value={editing.mode} onChange={(e)=>setEditing({...editing, mode: e.target.value as Row["mode"]})}>
                <option value="Manual">Manual</option>
                <option value="Auto">Auto</option>
              </select>
            </Field>
            <Field label="Status">
              <select className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                      value={editing.status}
                      onChange={(e)=>setEditing({...editing, status: e.target.value as Row["status"]})}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="PAUSED">PAUSED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </Field>
            <Field label="Hidden">
              <select className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                      value={editing.hidden ? "1":"0"}
                      onChange={(e)=>setEditing({...editing, hidden: e.target.value==="1"})}>
                <option value="0">no</option>
                <option value="1">yes</option>
              </select>
            </Field>
            <Field label="Target URL">
              <input className="w-full rounded-xl bg-zinc-900 px-3 py-2 outline-none border border-white/15"
                     value={editing.targetUrl ?? ""} onChange={(e)=>setEditing({...editing, targetUrl:e.target.value})}/>
            </Field>
          </div>

          <div className="flex gap-2">
            <button onClick={saveEdit} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15">Сохранить</button>
            <button onClick={()=>setEditing(null)} className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15">Отмена</button>
          </div>
        </div>
      )}

      <NavDrawer open={open} onClose={()=>setOpen(false)} locale={locale} isAdmin />
    </section>
  );
}

function Th({children}:{children:React.ReactNode}){return <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>;}
function Td({children}:{children:React.ReactNode}){return <td className="px-4 py-3 whitespace-nowrap">{children}</td>;}
function Field({label, children}:{label:string; children:React.ReactNode}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-white/70">{label}</div>
      {children}
    </label>
  );
}
