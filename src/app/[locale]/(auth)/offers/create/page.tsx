"use client";

import { usePathname } from "next/navigation";
import React, { useState } from "react";
import NavDrawer from "@/app/components/NavDrawer";

export default function CreateOfferPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [state, setState] = useState<"idle"|"saving"|"ok"|"err">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("saving"); setMsg("");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/offers", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ? JSON.stringify(data.error) : "Failed");
      setState("ok"); setMsg("Offer created");
      e.currentTarget.reset();
    } catch (err: any) {
      setState("err"); setMsg(err?.message ?? "Error");
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6 p-4 text-white/90">
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

      <h1 className="text-4xl font-extrabold leading-tight">Create Offer</h1>

      <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md">
        <L label="Title"><I name="title" required /></L>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <L label="GEO"><I name="geo" required placeholder="US, UA..." /></L>
          <L label="Vertical"><I name="vertical" required placeholder="Finance, Dating..." /></L>
          <L label="CPA (optional)"><I name="cpa" type="number" step="0.01" placeholder="0.00" /></L>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <L label="Mode">
            <select name="mode" className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none">
              <option>Auto</option>
              <option>Manual</option>
            </select>
          </L>
          <L label="Tag (optional)"><I name="tag" placeholder="featured" /></L>
          <L label="Target URL (optional)"><I name="targetUrl" placeholder="https://..." /></L>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-xl bg-white/10 border border-white/20 px-4 py-2 hover:bg-white/15" disabled={state==="saving"}>
            {state==="saving" ? "Saving…" : "Create"}
          </button>
          {!!msg && <span className={`text-sm ${state==="err" ? "text-red-300" : "text-white/70"}`}>{msg}</span>}
        </div>
      </form>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </section>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block">{<div className="mb-1 text-sm text-white/80">{label}</div>}{children}</label>;
}
function I(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none" />;
}
