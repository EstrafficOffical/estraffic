"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import NavDrawer from "@/app/components/NavDrawer";

export default function OfferCreatePage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;

  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    title: "",
    tag: "",
    cpa: "",
    geo: "",
    vertical: "",
    kpi1: "",
    kpi2: "",
    mode: "Auto" as "Auto" | "Manual",
  });

  const onChange = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErrors({});

    const payload = {
      title: form.title,
      tag: form.tag || null,
      cpa: form.cpa === "" ? null : Number(form.cpa),
      geo: form.geo,
      vertical: form.vertical,
      kpi1: form.kpi1 === "" ? null : Number(form.kpi1),
      kpi2: form.kpi2 === "" ? null : Number(form.kpi2),
      mode: form.mode,
    };

    try {
      const res = await fetch("/api/offers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors(data?.errors ?? {});
        setMsg(data?.error ?? "Не удалось создать оффер");
        return;
      }

      setMsg("✅ Оффер создан");
      // переход на список офферов
      setTimeout(() => router.push(`/${locale}/offers`), 600);
    } catch (err: any) {
      setMsg("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="relative max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Кнопка-звезда (открывает Drawer) + Estrella */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black/80" aria-hidden>
            <path
              fill="currentColor"
              d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z"
            />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
        New Offer
      </h1>

      {/* Форма */}
      <form
        onSubmit={onSubmit}
        className="rounded-2xl bg-white/8 border border-white/15 backdrop-blur-xl p-6 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabeledInput
            label="Title *"
            value={form.title}
            onChange={(v) => onChange("title", v)}
            error={errors.title?.[0]}
            placeholder="Crypto App Install"
          />
          <LabeledInput
            label="Tag"
            value={form.tag}
            onChange={(v) => onChange("tag", v)}
            placeholder="Exclusive / Trending / ..."
          />
          <LabeledInput
            label="CPA ($)"
            type="number"
            value={form.cpa}
            onChange={(v) => onChange("cpa", v)}
            placeholder="300"
          />
          <LabeledInput
            label="GEO *"
            value={form.geo}
            onChange={(v) => onChange("geo", v)}
            error={errors.geo?.[0]}
            placeholder="US"
          />
          <LabeledInput
            label="Vertical *"
            value={form.vertical}
            onChange={(v) => onChange("vertical", v)}
            error={errors.vertical?.[0]}
            placeholder="Finance / Gaming / Dating"
          />
          <LabeledInput
            label="KPI 1"
            type="number"
            value={form.kpi1}
            onChange={(v) => onChange("kpi1", v)}
            placeholder="1.2"
          />
          <LabeledInput
            label="KPI 2"
            type="number"
            value={form.kpi2}
            onChange={(v) => onChange("kpi2", v)}
            placeholder="1.1"
          />
          <div>
            <label className="block text-sm mb-1 text-white/80">Mode</label>
            <select
              className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
              value={form.mode}
              onChange={(e) => onChange("mode", e.target.value)}
            >
              <option value="Auto">Auto</option>
              <option value="Manual">Manual</option>
            </select>
          </div>
        </div>

        {msg && <p className="text-sm text-white/70">{msg}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 disabled:opacity-60"
          >
            {loading ? "Создаём..." : "Создать оффер"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/offers`)}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10"
          >
            Отмена
          </button>
        </div>
      </form>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}

function LabeledInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-sm mb-1 text-white/80">{props.label}</label>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl bg-zinc-900 text-white border border-white/15 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/40"
      />
      {props.error && (
        <div className="mt-1 text-xs text-red-400">{props.error}</div>
      )}
    </div>
  );
}
