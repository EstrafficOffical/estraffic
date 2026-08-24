"use client";

import {
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

export default function TierAssignment({
  userId,
  currentTier,
}: {
  userId: string;
  currentTier: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tier, setTier] =
    useState(currentTier);
  const [busy, setBusy] =
    useState(false);

  async function changeTier(
    nextTier: number,
  ) {
    if (nextTier === tier || busy) {
      return;
    }

    if (
      !confirm(
        `Change affiliate access tier from Tier ${tier} to Tier ${nextTier}?`,
      )
    ) {
      return;
    }

    const previousTier = tier;
    setTier(nextTier);
    setBusy(true);

    const response = await fetch(
      `/api/admin/users/${userId}/tier`,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
        },
        body: JSON.stringify({
          tier: nextTier,
        }),
      },
    );

    const json = await response
      .json()
      .catch(() => ({}));

    if (
      response.status === 428 &&
      json?.error ===
        "STEP_UP_REQUIRED"
    ) {
      const locale =
        pathname.split("/")[1] ||
        "en";

      window.location.assign(
        `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
          pathname,
        )}`,
      );

      return;
    }

    if (!response.ok || !json?.ok) {
      setTier(previousTier);
      setBusy(false);

      alert(
        json?.message ||
          json?.error ||
          "Could not change affiliate tier.",
      );

      return;
    }

    setTier(
      Number(
        json?.user?.tier ??
          nextTier,
      ),
    );
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="min-w-[118px]">
      <select
        value={tier}
        disabled={busy}
        onChange={(event) =>
          void changeTier(
            Number(
              event.target.value,
            ),
          )
        }
        className="h-9 w-full rounded-lg border border-white/[0.09] bg-[#111115] px-2.5 text-xs font-semibold text-white/72 outline-none transition focus:border-[#7657ff]/45 disabled:opacity-45"
        aria-label="Affiliate tier"
      >
        <option value={1}>
          Tier 1
        </option>
        <option value={2}>
          Tier 2
        </option>
        <option value={3}>
          Tier 3
        </option>
      </select>

      <div className="mt-1 text-[9px] text-white/24">
        {busy
          ? "Saving..."
          : "Access tier"}
      </div>
    </div>
  );
}