"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
  hidden: boolean;
  onToggledHidden?: (next: boolean) => void;
  onArchived?: () => void;
  onDeleted?: () => void;
  disabled?: boolean;
};

export default function RowActions({
  id,
  title,
  hidden,
  onToggledHidden,
  onArchived,
  onDeleted,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<"hide" | "archive" | "delete" | null>(null);
  const lock = disabled || !!busy;

  async function call(url: string, init?: RequestInit) {
    const r = await fetch(url, init);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j?.error) throw new Error(j?.error || "Failed");
    return j;
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

  const btn = (label: string, onClick: () => void, variant: "ghost" | "warn" | "danger" = "ghost") => {
    const map: Record<typeof variant, string> = {
      ghost: "bg-white/10 border-white/15 hover:bg-white/15",
      warn: "bg-amber-400/15 border-amber-400/30 text-amber-100 hover:bg-amber-400/20",
      danger: "bg-rose-400/15 border-rose-400/30 text-rose-100 hover:bg-rose-400/20",
    } as any;
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
    <div className="flex items-center gap-2">
      {btn(hidden ? "Показать" : "Скрыть", toggleHidden)}
      {btn("Архив", archiveOffer, "warn")}
      {btn("Удалить", deleteOffer, "danger")}
      {busy && <span className="text-xs text-white/60">…</span>}
    </div>
  );
}
