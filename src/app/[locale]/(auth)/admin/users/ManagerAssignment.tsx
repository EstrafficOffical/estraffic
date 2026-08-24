"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StaffOption = {
  id: string;
  name: string | null;
  email: string;
  role: "MANAGER" | "ADMIN" | "OWNER";
};

type Props = {
  userId: string;
  currentManagerId: string | null;
  managers: StaffOption[];
};

export default function ManagerAssignment({
  userId,
  currentManagerId,
  managers,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function redirectToStepUp() {
    const locale =
      window.location.pathname.split("/")[1] || "en";

    window.location.assign(
      `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
        window.location.pathname,
      )}`,
    );
  }

  async function changeManager(nextManagerId: string) {
    if (busy) return;

    const normalized = nextManagerId || null;

    if (
      normalized === (currentManagerId || null)
    ) {
      return;
    }

    const selected = managers.find(
      (manager) => manager.id === normalized,
    );

    const label = selected
      ? selected.name || selected.email
      : "Unassigned";

    if (
      !window.confirm(
        `Change assigned manager to ${label}?`,
      )
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/manager`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            managerId: normalized,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 428 &&
        data?.error === "STEP_UP_REQUIRED"
      ) {
        redirectToStepUp();
        return;
      }

      if (!response.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            "Could not change assigned manager",
        );
      }

      router.refresh();
    } catch (error: any) {
      alert(
        error?.message ||
          "Could not change assigned manager",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={currentManagerId || ""}
      disabled={busy}
      onChange={(event) =>
        void changeManager(event.target.value)
      }
      className="min-w-[170px] rounded-lg border border-white/[0.08] bg-[#111115] px-2.5 py-1.5 text-xs text-white/70 outline-none transition focus:border-[#7657ff]/45 disabled:cursor-wait disabled:opacity-45"
      aria-label="Assigned manager"
    >
      <option value="">Unassigned</option>

      {managers.map((manager) => (
        <option key={manager.id} value={manager.id}>
          {(manager.name || manager.email) +
            ` · ${manager.role}`}
        </option>
      ))}
    </select>
  );
}