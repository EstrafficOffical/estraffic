"use client";

import { useState } from "react";

type OfferPatch = {
  title?: string;
  tag?: string | null;
  geo?: string;
  vertical?: string;
  tier?: number;
  cpa?: number | null;
  cap?: number | null;
  mode?: "Auto" | "Manual";
  minDeposit?: number | null;
  holdDays?: number | null;
  hidden?: boolean;
};

type Props = {
  id: string;
  title: string;
  hidden: boolean;
  geo?: string;
  vertical?: string;
  tier?: number;
  cpa?: number | null;
  cap?: number | null;
  mode?: "Auto" | "Manual";
  minDeposit?: number | null;
  holdDays?: number | null;
  onRowPatched?: (patch: Partial<OfferPatch>) => void;
  onToggledHidden?: (next: boolean) => void;
  onArchived?: () => void;
  onDeleted?: () => void;
  disabled?: boolean;
};

export default function RowActions({
  id,
  title,
  hidden,
  geo,
  vertical,
  tier,
  cpa,
  cap,
  mode,
  minDeposit,
  holdDays,
  onRowPatched,
  onToggledHidden,
  onArchived,
  onDeleted,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<"edit" | "hide" | "archive" | "delete" | null>(null);
  const lock = disabled || !!busy;

  async function call(url: string, init?: RequestInit) {
    const r = await fetch(url, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.error) throw new Error(j?.error || "Failed");
    return j;
  }

  async function editOffer() {
    if (lock) return;

    const nextTitle = prompt("Title", title);
    if (nextTitle === null) return;

    const nextGeo = prompt("GEO", geo ?? "");
    if (nextGeo === null) return;

    const nextVertical = prompt("Vertical", vertical ?? "");
    if (nextVertical === null) return;

    const nextTier = prompt("Tier (1, 2, 3)", String(tier ?? 3));
    if (nextTier === null) return;

    const nextCpa = prompt("CPA (empty = null)", cpa == null ? "" : String(cpa));
    if (nextCpa === null) return;

    const nextCap = prompt("Cap (empty = null)", cap == null ? "" : String(cap));
    if (nextCap === null) return;

    const nextMinDeposit = prompt(
      "Min deposit (empty = null)",
      minDeposit == null ? "" : String(minDeposit)
    );
    if (nextMinDeposit === null) return;

    const nextHoldDays = prompt(
      "Hold days (empty = null)",
      holdDays == null ? "" : String(holdDays)
    );
    if (nextHoldDays === null) return;

    const nextMode = prompt("Mode (Auto or Manual)", mode ?? "Manual");
    if (nextMode === null) return;

    setBusy("edit");
    try {
      const j = await call("/api/admin/offers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: id,
          title: nextTitle.trim(),
          geo: nextGeo.trim(),
          vertical: nextVertical.trim(),
          tier: nextTier.trim(),
          cpa: nextCpa.trim() === "" ? null : nextCpa.trim(),
          cap: nextCap.trim() === "" ? null : nextCap.trim(),
          minDeposit: nextMinDeposit.trim() === "" ? null : nextMinDeposit.trim(),
          holdDays: nextHoldDays.trim() === "" ? null : nextHoldDays.trim(),
          mode: nextMode.trim(),
        }),
      });

      const offer = j?.offer;
      if (offer) {
        onRowPatched?.({
          title: offer.title,
          geo: offer.geo,
          vertical: offer.vertical,
          tier: offer.tier,
          cpa: offer.cpa,
          cap: offer.cap,
          mode: offer.mode,
          minDeposit: offer.minDeposit,
          holdDays: offer.holdDays,
          hidden: offer.hidden,
        });
      }
    } catch (e) {
      alert((e as any)?.message || "Не удалось обновить оффер");
    } finally {
      setBusy(null);
    }
  }

  async function toggleHidden() {
    if (lock) return;
    setBusy("hide");
    try {
      const j = await call("/api/admin/offers/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: id, hidden: !hidden }),
      });
      onToggledHidden?.(j?.offer?.hidden ?? !hidden);
    } catch (e) {
      alert((e as any)?.message || "Не удалось изменить видимость");
    } finally {
      setBusy(null);
    }
  }

  async function archiveOffer() {
    if (lock) return;
    if (!confirm(`Перевести оффер «${title}» в архив?`)) return;
    setBusy("archive");
    try {
      await call(`/api/admin/offers/${id}/archive`, { method: "POST" });
      onArchived?.();
    } catch (e) {
      alert((e as any)?.message || "Не удалось архивировать оффер");
    } finally {
      setBusy(null);
    }
  }

  async function deleteOffer() {
    if (lock) return;
    const msg =
      `Удалить оффер «${title}» безвозвратно?\n\n` +
      `❗ Будет удалена только карточка оффера.\n` +
      `Если есть клики/конверсии — удаление запрещено (используйте «Архив»).`;
    if (!confirm(msg)) return;

    setBusy("delete");
    try {
      await call(`/api/admin/offers/${id}`, { method: "DELETE" });
      onDeleted?.();
    } catch (e) {
      alert((e as any)?.message || "Не удалось удалить оффер");
    } finally {
      setBusy(null);
    }
  }

  const btn = (
    label: string,
    onClick: () => void,
    variant: "ghost" | "warn" | "danger" | "blue" = "ghost"
  ) => {
    const map: Record<typeof variant, string> = {
      ghost: "bg-white/10 border-white/15 hover:bg-white/15",
      warn: "bg-amber-400/15 border-amber-400/30 text-amber-100 hover:bg-amber-400/20",
      danger: "bg-rose-400/15 border-rose-400/30 text-rose-100 hover:bg-rose-400/20",
      blue: "bg-sky-400/15 border-sky-400/30 text-sky-100 hover:bg-sky-400/20",
    } as const;

    return (
      <button
        onClick={onClick}
        disabled={lock}
        className={`rounded-xl px-3 py-1.5 border text-sm ${map[variant]} disabled:opacity-50`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {btn("Edit", editOffer, "blue")}
      {btn(hidden ? "Показать" : "Скрыть", toggleHidden)}
      {btn("Архив", archiveOffer, "warn")}
      {btn("Удалить", deleteOffer, "danger")}
      {busy && <span className="text-xs text-white/60">…</span>}
    </div>
  );
}