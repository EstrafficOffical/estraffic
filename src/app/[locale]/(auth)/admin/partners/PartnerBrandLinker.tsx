"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type BrandChoice = {
  id: string;
  name: string;
  vertical: string;
  status: string;
  defaultPartnerId: string | null;
  defaultPartnerName: string | null;
};

type Props = {
  partnerId: string;
  partnerName: string;
  brands: BrandChoice[];
};

export default function PartnerBrandLinker({
  partnerId,
  partnerName,
  brands,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const initialIds = useMemo(
    () =>
      brands
        .filter(
          (brand) =>
            brand.defaultPartnerId ===
            partnerId,
        )
        .map((brand) => brand.id),
    [brands, partnerId],
  );

  const [open, setOpen] =
    useState(false);
  const [selected, setSelected] =
    useState<string[]>(initialIds);
  const [q, setQ] = useState("");
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");

  const visible = brands.filter(
    (brand) =>
      !q.trim() ||
      [
        brand.name,
        brand.vertical,
        brand.status,
        brand.defaultPartnerName || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(
          q.trim().toLowerCase(),
        ),
  );

  function openModal() {
    setSelected(initialIds);
    setQ("");
    setError("");
    setOpen(true);
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (value) => value !== id,
          )
        : [...current, id],
    );
  }

  function goToStepUp() {
    const locale =
      pathname.split("/")[1] || "en";

    window.location.assign(
      `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
        pathname,
      )}`,
    );
  }

  async function save() {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/partners/${partnerId}/brands`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            brandIds: selected,
          }),
        },
      );

      const body = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 428 &&
        body?.error ===
          "STEP_UP_REQUIRED"
      ) {
        goToStepUp();
        return;
      }

      if (!response.ok || !body?.ok) {
        setError(
          body?.error ===
            "BRAND_NOT_FOUND"
            ? "One of the selected brands no longer exists."
            : "Could not update partner brands.",
        );
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError(
        "Could not update partner brands.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white"
      >
        Manage brands
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-[760px] overflow-hidden rounded-3xl border border-white/[0.10] bg-[#0d0f14] shadow-[0_40px_140px_rgba(0,0,0,.65)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8068ff]">
                  Partner inventory
                </div>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                  Manage brands
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Choose which brands use{" "}
                  <span className="text-white/65">
                    {partnerName}
                  </span>{" "}
                  as their default advertiser
                  partner.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-lg text-white/35 transition hover:bg-white/[0.04] hover:text-white"
              >
                Г—
              </button>
            </div>

            <div className="border-b border-white/[0.07] p-5">
              <input
                value={q}
                onChange={(event) =>
                  setQ(event.target.value)
                }
                placeholder="Search brands..."
                className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-xs text-white outline-none placeholder:text-white/22 focus:border-[#7657ff]/45"
              />
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-5">
              {visible.length ? (
                <div className="space-y-2">
                  {visible.map((brand) => {
                    const checked =
                      selected.includes(
                        brand.id,
                      );

                    const ownedElsewhere =
                      Boolean(
                        brand.defaultPartnerId &&
                          brand.defaultPartnerId !==
                            partnerId,
                      );

                    return (
                      <label
                        key={brand.id}
                        className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                          checked
                            ? "border-[#7657ff]/35 bg-[#7657ff]/[0.07]"
                            : "border-white/[0.07] bg-black/10 hover:bg-white/[0.025]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggle(brand.id)
                          }
                          className="h-4 w-4 accent-[#7657ff]"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-white/80">
                            {brand.name}
                          </div>

                          <div className="mt-1 text-[10px] text-white/28">
                            {brand.vertical} В·{" "}
                            {brand.status}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {brand.defaultPartnerId ===
                          partnerId ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                              Linked here
                            </span>
                          ) : ownedElsewhere ? (
                            <div>
                              <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold text-amber-300">
                                Another partner
                              </div>

                              <div className="mt-1 max-w-[150px] truncate text-[9px] text-white/24">
                                {
                                  brand.defaultPartnerName
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="text-[9px] text-white/24">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.07] px-4 py-10 text-center text-xs text-white/28">
                  No brands found.
                </div>
              )}
            </div>

            {error ? (
              <div className="mx-5 mb-4 rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs text-red-200/85">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-[10px] text-white/28">
                {selected.length} selected В·
                effective flows inherit this
                partner automatically unless a
                flow has its own override.
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  disabled={busy}
                  className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white/48 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={save}
                  disabled={busy}
                  className="rounded-xl bg-[#7657ff] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff] disabled:opacity-50"
                >
                  {busy
                    ? "Saving..."
                    : "Save links"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}