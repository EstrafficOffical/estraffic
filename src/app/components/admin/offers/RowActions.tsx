"use client";

import { useState } from "react";

type Props = {
  id: string;
  title: string;
  hidden: boolean;
  onEdit?: () => void;
  onToggledHidden?: (next: boolean) => void;
  onArchived?: () => void;
  onDeleted?: () => void;
  disabled?: boolean;
};

function redirectToStepUp() {
  const locale = window.location.pathname.split("/")[1] || "en";
  window.location.assign(
    `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
      window.location.pathname,
    )}`,
  );
}

export default function RowActions({
  id,
  title,
  hidden,
  onEdit,
  onToggledHidden,
  onArchived,
  onDeleted,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<
    "hide" | "archive" | "delete" | null
  >(null);

  const lock = disabled || Boolean(busy);

  async function call(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const json = await response.json().catch(() => ({}));

    if (
      response.status === 428 &&
      json?.error === "STEP_UP_REQUIRED"
    ) {
      redirectToStepUp();
      throw new Error("STEP_UP_REQUIRED");
    }

    if (!response.ok || json?.error) {
      throw new Error(
        json?.message || json?.error || "Request failed",
      );
    }

    return json;
  }

  async function toggleHidden() {
    if (lock) return;
    setBusy("hide");

    try {
      const json = await call("/api/admin/offers/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: id,
          hidden: !hidden,
        }),
      });

      onToggledHidden?.(json?.offer?.hidden ?? !hidden);
    } catch (error: any) {
      if (error?.message !== "STEP_UP_REQUIRED") {
        alert(error?.message || "Could not change offer visibility.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function archiveOffer() {
    if (lock) return;

    if (!confirm(`Archive "${title}"?`)) return;
    setBusy("archive");

    try {
      await call(`/api/admin/offers/${id}/archive`, {
        method: "POST",
      });
      onArchived?.();
    } catch (error: any) {
      if (error?.message !== "STEP_UP_REQUIRED") {
        alert(error?.message || "Could not archive this offer.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function deleteOffer() {
    if (lock) return;

    const message =
      `Delete "${title}" permanently?\n\n` +
      "Deletion is only allowed when the offer has no clicks or conversions. " +
      "Use Archive for offers with history.";

    if (!confirm(message)) return;
    setBusy("delete");

    try {
      await call(`/api/admin/offers/${id}`, {
        method: "DELETE",
      });
      onDeleted?.();
    } catch (error: any) {
      if (error?.message !== "STEP_UP_REQUIRED") {
        alert(error?.message || "Could not delete this offer.");
      }
    } finally {
      setBusy(null);
    }
  }

  const button = (
    label: string,
    onClick: () => void,
    variant: "ghost" | "warn" | "danger" | "blue" = "ghost",
  ) => {
    const styles: Record<typeof variant, string> = {
      ghost: "bg-white/10 border-white/15 hover:bg-white/15",
      warn:
        "bg-amber-400/15 border-amber-400/30 text-amber-100 hover:bg-amber-400/20",
      danger:
        "bg-rose-400/15 border-rose-400/30 text-rose-100 hover:bg-rose-400/20",
      blue:
        "bg-sky-400/15 border-sky-400/30 text-sky-100 hover:bg-sky-400/20",
    };

    return (
      <button
        type="button"
        onClick={onClick}
        disabled={lock}
        className={`rounded-xl border px-3 py-1.5 text-sm ${styles[variant]} disabled:opacity-50`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {button("Edit", () => onEdit?.(), "blue")}
      {button(hidden ? "Show" : "Hide", toggleHidden)}
      {button("Archive", archiveOffer, "warn")}
      {button("Delete", deleteOffer, "danger")}
      {busy && <span className="text-xs text-white/60">Saving...</span>}
    </div>
  );
}