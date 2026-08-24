"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  status: string;
  canPromote: boolean;
};

export default function StaffAccessActions({
  userId,
  status,
  canPromote,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function stepUpRedirect() {
    const locale = window.location.pathname.split("/")[1] || "ru";
    window.location.assign(
      `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
        window.location.pathname,
      )}`,
    );
  }

  async function post(path: string, body?: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json().catch(() => ({}));

    if (
      response.status === 428 &&
      json?.error === "STEP_UP_REQUIRED"
    ) {
      stepUpRedirect();
      return false;
    }

    if (!response.ok || json?.ok === false) {
      throw new Error(
        json?.message ||
          json?.error ||
          "Request failed",
      );
    }

    return true;
  }

  async function promote(role: "MANAGER" | "ADMIN") {
    if (!confirm(`Grant ${role} staff access to this account?`)) return;

    setBusy(true);
    try {
      const ok = await post(`/api/admin/team/${userId}`, {
        action: "set-role",
        role,
      });

      if (ok) router.refresh();
    } catch (error: any) {
      alert(error?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeAffiliateStatus() {
    const isBanned = status === "BANNED";

    const question = isBanned
      ? "Reactivate this affiliate account?"
      : "Ban this affiliate? Their active session will be revoked immediately.";

    if (!confirm(question)) return;

    setBusy(true);
    try {
      const ok = await post(
        isBanned
          ? `/api/admin/users/${userId}/approve`
          : `/api/admin/users/${userId}/ban`,
      );

      if (ok) router.refresh();
    } catch (error: any) {
      alert(error?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const isPending = status === "PENDING";
  const isBanned = status === "BANNED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canPromote ? (
        <select
          disabled={busy}
          defaultValue=""
          onChange={(event) => {
            const value = event.target.value as "MANAGER" | "ADMIN";
            if (value) void promote(value);
            event.currentTarget.value = "";
          }}
          className="rounded-lg border border-white/[0.08] bg-[#111115] px-2 py-1.5 text-xs text-white/65 disabled:opacity-40"
        >
          <option value="">Promote to staff...</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
      ) : null}

      {!isPending ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void changeAffiliateStatus()}
          className={
            isBanned
              ? "rounded-lg border border-emerald-400/30 bg-emerald-400/[0.06] px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-40"
              : "rounded-lg border border-rose-400/30 bg-rose-400/[0.06] px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
          }
        >
          {busy ? "Saving..." : isBanned ? "Reactivate" : "Ban"}
        </button>
      ) : (
        <span className="text-xs text-white/30">Review registration</span>
      )}
    </div>
  );
}