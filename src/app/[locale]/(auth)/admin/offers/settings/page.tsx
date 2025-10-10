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
  mode: "Auto" | "Manual";
  status: "ACTIVE" | "ARCHIVED" | "PAUSED";
  hidden: boolean;
  targetUrl: string | null;
  kpi1Text: string | null;
  kpi2Text: string | null;
};

export default function OfferSettingsPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<Row | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/list", { cache: "no-store" });
      const j = await r.json();
      const items: Row[] = (j?.items ?? []).map((x: any) => ({
        ...x,
        cpa: x.cpa ?? null,
        cap: x.cap ?? null,
      }));
      setRows(items);
    } catch {
      setMsg("Не удалось загрузить офферы");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveChanges() {
    if (!edit) return;
    setMsg(null);
    try {
      const r = await fetch("/api/admin/offers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: edit.id,
          title: edit.title,
          tag: edit.tag,
          geo: edit.geo,
          vertical: edit.vertical,
          cpa: edit.cpa,
          cap: edit.cap,
          mode: edit.mode,
          status: edit.status,
          hidden: edit.hidden,
          targetUrl: edit.targetUrl,
          kpi1Text: edit.kpi1Text,
          kpi2Text: edit.kpi2Text,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed");
      setRows(s => s.map(x => x.id === edit.id ? { ...x, ...j.offer } : x));
      setEdit(null);
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
            <tr>
              <Th>Title</Th><Th>Tag</Th><Th>GEO</Th><Th>Vertical</Th><Th>CPA</Th><Th>Cap</Th><Th>Mode</Th><Th>Hidden</Th><Th>Edit</Th>
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
                  <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                  <Td>{r.cap ?? "—"}</Td>
                  <Td>{r.mode}</Td>
                  <Td>{r.hidden ? "yes" : "no"}</Td>
                  <Td>
                    <button
                      className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15"
                      onClick={() => setEdit(r)}
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

      {/* Drawer/Modal простым блоком */}
      {edit && (
        <div className="rounded-2xl border border-white/15 bg-zinc-900/80 backdrop-blur-xl p-4 space-y-3">
          <h3 className="text-xl font-semibold">Редактировать оффер</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Inp label="Title" value={edit.title} onChange={v=>setEdit(s=>s && ({...s, title:v}))}/>
            <Inp label="Tag" value={edit.tag ?? ""} onChange={v=>setEdit(s=>s && ({...s, tag:v||null}))}/>
            <Inp label="GEO" value={edit.geo} onChange={v=>setEdit(s=>s && ({...s, geo:v}))}/>
            <Inp label="Vertical" value={edit.vertical} onChange={v=>setEdit(s=>s && ({...s, vertical:v}))}/>
            <Num label="CPA" value={edit.cpa} onChange={v=>setEdit(s=>s && ({...s, cpa:v}))}/>
            <Num label="Cap" value={edit.cap} onChange={v=>setEdit(s=>s && ({...s, cap:v}))}/>
            <Sel label="Mode" value={edit.mode} options={["Manual","Auto"]} onChange={v=>setEdit(s=>s && ({...s, mode:v as any}))}/>
            <Sel label="Status" value={edit.status} options={["ACTIVE","PAUSED","ARCHIVED"]} onChange={v=>setEdit(s=>s && ({...s, status:v as any}))}/>
            <Inp label="Target URL" value={edit.targetUrl ?? ""} onChange={v=>setEdit(s=>s && ({...s, targetUrl:v||null}))} />
            <Inp label="KPI1 (text)" value={edit.kpi1Text ?? ""} onChange={v=>setEdit(s=>s && ({...s, kpi1Text:v||null}))}/>
            <Inp label="KPI2 (text)" value={edit.kpi2Text ?? ""} onChange={v=>setEdit(s=>s && ({...s, kpi2Text:v||null}))}/>
            <div className="flex items-center gap-2">
              <input id="hidden" type="checkbox" checked={edit.hidden} onChange={e=>setEdit(s=>s && ({...s, hidden:e.target.checked}))}/>
              <label htmlFor="hidden">Hidden</label>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15" onClick={saveChanges}>Сохранить</button>
            <button className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 hover:bg-white/15" onClick={()=>setEdit(null)}>Отмена</button>
          </div>
        </div>
      )}

      <NavDrawer open={open} onClose={()=>setOpen(false)} locale={locale} isAdmin />
    </section>
  );
}

function Th({children}:{children:React.ReactNode}){return <th className="px-4 py-3 font-semibold">{children}</th>}
function Td({children}:{children:React.ReactNode}){return <td className="px-4 py-3">{children}</td>}
function Inp({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return (<label className="block"><div className="text-sm text-white/70 mb-1">{label}</div>
    <input className="w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 outline-none" value={value} onChange={e=>onChange(e.target.value)}/></label>);
}
function Num({label,value,onChange}:{label:string;value:number|null;onChange:(v:number|null)=>void}){
  return (<label className="block"><div className="text-sm text-white/70 mb-1">{label}</div>
    <input type="number" className="w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 outline-none"
      value={value==null? "": String(value)} onChange={e=>onChange(e.target.value===""?null:Number(e.target.value))}/></label>);
}
function Sel({label,value,options,onChange}:{label:string;value:string;options:string[];onChange:(v:string)=>void}){
  return (<label className="block"><div className="text-sm text-white/70 mb-1">{label}</div>
    <select className="w-full rounded-lg border border-white/15 bg-zinc-900 px-3 py-2 outline-none" value={value} onChange={e=>onChange(e.target.value)}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select></label>);
}
