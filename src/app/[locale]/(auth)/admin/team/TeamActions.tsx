"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";
import { useState } from "react";

export default function TeamActions({
  id,
  role,
  status,
  myRole,
  isSelf,
}: {
  id: string;
  role: string;
  status: string;
  myRole: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  function goToStepUp() {
    const locale =
      pathname.split("/")[1] || "ru";

    window.location.assign(
      `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
        pathname,
      )}`,
    );
  }

  async function act(
    body: any,
    question: string,
  ) {
    if (!confirm(question)) return;

    setBusy(true);

    try {
      const response = await fetch(
        `/api/admin/team/${id}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 428 &&
        json?.error === "STEP_UP_REQUIRED"
      ) {
        goToStepUp();
        return;
      }

      if (!response.ok) {
        throw new Error(
          json?.message ||
            json?.error ||
            "Request failed",
        );
      }

      router.refresh();
    } catch (error: any) {
      alert(error?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const canOwner = myRole === "OWNER";
  const canAdmin =
    myRole === "ADMIN" && role === "MANAGER";

  return (
    <div className="flex items-center gap-2">
      <select
        disabled={
          busy ||
          (!canOwner && !canAdmin) ||
          isSelf
        }
        value={role}
        onChange={(event) =>
          act(
            {
              action: "set-role",
              role: event.target.value,
            },
            `Change role to ${event.target.value}?`,
          )
        }
        className="rounded-lg border border-white/[0.08] bg-[#111115] px-2 py-1.5 text-xs text-white/65"
      >
        <option>MANAGER</option>
        {canOwner ? <option>ADMIN</option> : null}
        {canOwner ? <option>OWNER</option> : null}
      </select>

      {!isSelf ? (
        <button
          disabled={
            busy ||
            (!canOwner && !canAdmin)
          }
          onClick={() =>
            act(
              {
                action:
                  status === "APPROVED"
                    ? "suspend"
                    : "reactivate",
              },
              status === "APPROVED"
                ? "Suspend this staff account?"
                : "Reactivate this staff account?",
            )
          }
          className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/55"
        >
          {status === "APPROVED"
            ? "Suspend"
            : "Reactivate"}
        </button>
      ) : null}

      {canOwner && !isSelf ? (
        <button
          disabled={busy}
          onClick={() =>
            act(
              { action: "remove-staff" },
              "Remove staff access and return this account to USER?",
            )
          }
          className="text-xs text-rose-300/75"
        >
          Remove staff
        </button>
      ) : null}
    </div>
  );
}
