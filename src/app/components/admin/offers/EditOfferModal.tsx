"use client";

import { useEffect, useState } from "react";

export type EditableOffer = {
  id: string;
  title: string;
  geo: string;
  vertical: string;
  tier: number;
  cpa: number | null;
  cap?: number | null;
  mode: "Auto" | "Manual";
  hidden: boolean;
  minDeposit?: number | null;
  holdDays?: number | null;
};

type Props = {
  open: boolean;
  offer: EditableOffer | null;
  onClose: () => void;
  onSaved: (patch: Partial<EditableOffer>) => void;
};

export default function EditOfferModal({ open, offer, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    geo: "",
    vertical: "",
    tier: "3",
    cpa: "",
    cap: "",
    mode: "Manual" as "Auto" | "Manual",
    minDeposit: "",
    holdDays: "",
  });

  useEffect(() => {
    if (!offer || !open) return;
    setMsg(null);
    setForm({
      title: offer.title ?? "",
      geo: offer.geo ?? "",
      vertical: offer.vertical ?? "",
      tier: String(offer.tier ?? 3),
      cpa: offer.cpa == null ? "" : String(offer.cpa),
      cap: offer.cap == null ? "" : String(offer.cap),
      mode: offer.mode ?? "Manual",
      minDeposit: offer.minDeposit == null ? "" : String(offer.minDeposit),
      holdDays: offer.holdDays == null ? "" : String(offer.holdDays),
    });
  }, [offer, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  if (!open || !offer) return null;

  async function submit(e: React.FormEvent) {
  e.preventDefault();

  if (!offer) return;

  setMsg(null);
  setSaving(true);
    try {
      const res = await fetch("/api/admin/offers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          title: form.title.trim(),
          geo: form.geo.trim(),
          vertical: form.vertical.trim(),
          tier: Number(form.tier),
          cpa: form.cpa.trim() === "" ? null : Number(form.cpa),
          cap: form.cap.trim() === "" ? null : Number(form.cap),
          mode: form.mode,
          minDeposit: form.minDeposit.trim() === "" ? null : Number(form.minDeposit),
          holdDays: form.holdDays.trim() === "" ? null : Number(form.holdDays),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Не удалось сохранить");
      }

      const updated = data.offer;
      onSaved({
        title: updated.title,
        geo: updated.geo,
        vertical: updated.vertical,
        tier: updated.tier,
        cpa: updated.cpa,
        cap: updated.cap,
        mode: updated.mode,
        minDeposit: updated.minDeposit,
        holdDays: updated.holdDays,
        hidden: updated.hidden,
      });

      onClose();
    } catch (e: any) {
      setMsg(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />

      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-3xl rounded-3xl border border-white/15 bg-zinc-950/95 p-5 text-white shadow-[0_20px_80px_rgba(0,0,0,.55)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Редактировать оффер</h2>
              <p className="mt-1 text-sm text-white/55">
                Измени основные параметры оффера в одном окне.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:bg-white/10 disabled:opacity-50"
            >
              Закрыть
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Title" required>
              <input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                required
              />
            </Field>

            <Field label="GEO" required>
              <input
                value={form.geo}
                onChange={(e) => setForm((s) => ({ ...s, geo: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                required
              />
            </Field>

            <Field label="Vertical" required>
              <input
                value={form.vertical}
                onChange={(e) => setForm((s) => ({ ...s, vertical: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                required
              />
            </Field>

            <Field label="Tier" required>
              <select
                value={form.tier}
                onChange={(e) => setForm((s) => ({ ...s, tier: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
              >
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
              </select>
            </Field>

            <Field label="CPA">
              <input
                type="number"
                step="0.01"
                value={form.cpa}
                onChange={(e) => setForm((s) => ({ ...s, cpa: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                placeholder="empty = null"
              />
            </Field>

            <Field label="Cap">
              <input
                type="number"
                step="1"
                min="0"
                value={form.cap}
                onChange={(e) => setForm((s) => ({ ...s, cap: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                placeholder="empty = null"
              />
            </Field>

            <Field label="Mode" required>
              <select
                value={form.mode}
                onChange={(e) => setForm((s) => ({ ...s, mode: e.target.value as "Auto" | "Manual" }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
              >
                <option value="Manual">Manual</option>
                <option value="Auto">Auto</option>
              </select>
            </Field>

            <Field label="Min deposit">
              <input
                type="number"
                step="0.01"
                value={form.minDeposit}
                onChange={(e) => setForm((s) => ({ ...s, minDeposit: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                placeholder="empty = null"
              />
            </Field>

            <Field label="Hold days">
              <input
                type="number"
                step="1"
                min="0"
                value={form.holdDays}
                onChange={(e) => setForm((s) => ({ ...s, holdDays: e.target.value }))}
                className="w-full rounded-xl bg-black/35 px-3 py-2.5 outline-none ring-1 ring-white/10 focus:ring-white/20"
                placeholder="empty = null"
              />
            </Field>
          </div>

          {msg && (
            <div className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {msg}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 font-medium hover:bg-white/15 disabled:opacity-60"
            >
              {saving ? "Сохраняю…" : "Сохранить"}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/15 px-4 py-2.5 text-white/75 hover:bg-white/10 disabled:opacity-60"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </>
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
      <div className="mb-1.5 text-sm text-white/70">
        {label} {required ? <span className="text-rose-400">*</span> : null}
      </div>
      {children}
    </label>
  );
}