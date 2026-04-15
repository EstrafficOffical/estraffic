"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

type Mode = "Auto" | "Manual";
type Tier = 1 | 2 | 3;

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
    cap: "",
    tier: 3 as Tier,
    mode: "Manual" as Mode,

    minDeposit: "",
    holdDays: "",

    kpi1Text: "",
    kpi2Text: "",

    rules: "",
    notes: "",

    targetUrl: "",
    trackingTemplate: "",
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
        cap: form.cap ? Number(form.cap) : null,
        tier: Number(form.tier),
        mode: form.mode,

        minDeposit: form.minDeposit ? Number(form.minDeposit) : null,
        holdDays: form.holdDays ? Number(form.holdDays) : null,

        kpi1Text: form.kpi1Text.trim() || null,
        kpi2Text: form.kpi2Text.trim() || null,

        rules: form.rules.trim() || null,
        notes: form.notes.trim() || null,

        targetUrl: form.targetUrl.trim() || null,
        trackingTemplate: form.trackingTemplate.trim() || null,
      };

      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to create offer");
      }

      setMsg("Оффер создан");
      setTimeout(() => router.push(`/${locale}/admin/offers`), 800);
    } catch (err: any) {
      setMsg(err?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 text-white/90 space-y-6">
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

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold">Создать оффер</h1>
        <p className="text-sm text-white/60">
          Заполни не только базовые поля, но и реальные условия оффера — они потом будут видны пользователям в карточках.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-md space-y-6"
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
              placeholder="US, UA, ..."
              required
            />
          </Field>

          <Field label="Vertical" required>
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.vertical}
              onChange={(e) => setForm((s) => ({ ...s, vertical: e.target.value }))}
              placeholder="Finance, Gambling, Dating ..."
              required
            />
          </Field>

          <Field label="CPA / FTD ($)">
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

          <Field label="Tier" required>
            <select
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.tier}
              onChange={(e) => setForm((s) => ({ ...s, tier: Number(e.target.value) as Tier }))}
            >
              <option value={1}>Tier 1</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
            </select>
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

          <Field label="Min deposit ($)">
            <input
              type="number"
              step="0.01"
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.minDeposit}
              onChange={(e) => setForm((s) => ({ ...s, minDeposit: e.target.value }))}
              placeholder="например 20"
            />
          </Field>

          <Field label="Hold days">
            <input
              type="number"
              min={0}
              step="1"
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.holdDays}
              onChange={(e) => setForm((s) => ({ ...s, holdDays: e.target.value }))}
              placeholder="например 7"
            />
          </Field>

          <Field label="KPI 1 (текст)">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.kpi1Text}
              onChange={(e) => setForm((s) => ({ ...s, kpi1Text: e.target.value }))}
              placeholder="напр. Min dep $20"
            />
          </Field>

          <Field label="KPI 2 (текст)">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.kpi2Text}
              onChange={(e) => setForm((s) => ({ ...s, kpi2Text: e.target.value }))}
              placeholder="напр. Только SEO / CR > 10%"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Field label="Rules">
            <textarea
              rows={5}
              className="w-full rounded-2xl bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white/20 resize-y"
              value={form.rules}
              onChange={(e) => setForm((s) => ({ ...s, rules: e.target.value }))}
              placeholder="Полные правила оффера: allowed sources, запреты, KPI, условия аппрува, GEO-specific notes..."
            />
          </Field>

          <Field label="Notes">
            <textarea
              rows={4}
              className="w-full rounded-2xl bg-black/40 px-3 py-3 outline-none ring-1 ring-white/10 focus:ring-white/20 resize-y"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Внутренние заметки или короткое описание оффера для веба"
            />
          </Field>

          <Field label="Target URL">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.targetUrl}
              onChange={(e) => setForm((s) => ({ ...s, targetUrl: e.target.value }))}
              placeholder="https://..."
            />
          </Field>

          <Field label="Tracking template">
            <input
              className="w-full rounded-xl bg-black/40 px-3 py-2 outline-none ring-1 ring-white/10 focus:ring-white/20"
              value={form.trackingTemplate}
              onChange={(e) => setForm((s) => ({ ...s, trackingTemplate: e.target.value }))}
              placeholder="https://partner.com/?subid={clickId}"
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