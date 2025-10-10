// src/app/[locale]/(auth)/admin/offers/create/page.tsx
"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Mode = "Auto" | "Manual";

export default function CreateOfferPage() {
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    tag: "",
    geo: "",
    vertical: "",
    cpa: "",
    kpi1Text: "",   // ← текст вместо числа
    kpi2Text: "",
    mode: "Manual" as Mode,
    targetUrl: "",
    cap: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        tag: form.tag.trim() || null,
        geo: form.geo.trim(),
        vertical: form.vertical.trim(),
        cpa: form.cpa ? Number(form.cpa) : null,
        kpi1Text: form.kpi1Text.trim() || null,
        kpi2Text: form.kpi2Text.trim() || null,
        mode: form.mode,
        targetUrl: form.targetUrl.trim() || null,
        cap: form.cap ? Number(form.cap) : null,
      };

      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create offer");

      setMsg("Оффер создан");
      setTimeout(() => router.push(`/${locale}/admin/offers`), 800);
    } catch (err: any) {
      setMsg(err?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-4 text-white/90 space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
          title="Меню"
        >
          ★
        </button>
        <span className="font-semibold">Estrella</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold">Создать оффер</h1>

      <form
        onSubmit={submit}
        className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-md space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              required
            />
          </Field>
          <Field label="Tag">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.tag}
              onChange={(e) => setForm((s) => ({ ...s, tag: e.target.value }))}
              placeholder="internal tag"
            />
          </Field>

          <Field label="GEO" required>
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.geo}
              onChange={(e) => setForm((s) => ({ ...s, geo: e.target.value }))}
              placeholder="US, UA, …"
              required
            />
          </Field>
          <Field label="Vertical" required>
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.vertical}
              onChange={(e) => setForm((s) => ({ ...s, vertical: e.target.value }))}
              placeholder="Finance, Dating, …"
              required
            />
          </Field>

          <Field label="CPA ($)">
            <input
              type="number"
              step="0.01"
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.cpa}
              onChange={(e) => setForm((s) => ({ ...s, cpa: e.target.value }))}
              placeholder="например 50"
            />
          </Field>

          <Field label="Cap (кол-во оплаченных DEP)">
            <input
              type="number"
              min={0}
              step="1"
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.cap}
              onChange={(e) => setForm((s) => ({ ...s, cap: e.target.value }))}
              placeholder="например 20"
            />
          </Field>

          <Field label="KPI1 (текст)">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.kpi1Text}
              onChange={(e) => setForm((s) => ({ ...s, kpi1Text: e.target.value }))}
              placeholder="напр. Min dep $20"
            />
          </Field>
          <Field label="KPI2 (текст)">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.kpi2Text}
              onChange={(e) => setForm((s) => ({ ...s, kpi2Text: e.target.value }))}
              placeholder="напр. CR > 10%"
            />
          </Field>

          <Field label="Mode" required>
            <select
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.mode}
              onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value as Mode }))}
            >
              <option value="Manual">Manual</option>
              <option value="Auto">Auto</option>
            </select>
          </Field>

          <Field label="Target URL">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.targetUrl}
              onChange={(e) => setForm((s) => ({ ...s, targetUrl: e.target.value }))}
              placeholder="https://…"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Сохраняю…" : "Создать"}
          </button>
          {msg && <span className="text-white/70 text-sm">{msg}</span>}
        </div>
      </form>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} isAdmin />
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-sm text-white/70">
        {label} {required ? <span className="text-red-400">*</span> : null}
      </div>
      {children}
    </label>
  );
}
