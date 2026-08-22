"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export default function StepUpPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const qs = useSearchParams();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  function safeCallback() {
    const raw =
      qs.get("callbackUrl") || `/${locale}`;

    if (
      raw === `/${locale}` ||
      raw.startsWith(`/${locale}/`)
    ) {
      return raw;
    }

    return `/${locale}`;
  }

  async function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/security/step-up",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            verificationCode: code.trim(),
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        setError(
          json?.error === "INVALID_CODE"
            ? "The authenticator or recovery code is invalid."
            : json?.error === "TOO_MANY_ATTEMPTS"
              ? "Too many verification attempts. Please wait and try again."
              : "Security verification failed. Please try again.",
        );
        setBusy(false);
        return;
      }

      window.location.assign(safeCallback());
    } catch {
      setError(
        "Security verification failed. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-80px)] px-5 py-10 md:px-8">
      <div className="mx-auto max-w-[560px]">
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#8068ff]">
            NEXUS Security
          </div>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
            Confirm sensitive action
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/42">
            Sensitive finance and access-control actions
            require a recent second-factor verification.
          </p>
        </div>

        <div className="rounded-3xl border border-white/[0.09] bg-[#0d0f14] p-6 shadow-[0_30px_100px_rgba(0,0,0,.35)]">
          <div className="mb-5 rounded-xl border border-[#7657ff]/20 bg-[#7657ff]/[0.06] px-4 py-3 text-xs leading-5 text-white/52">
            Enter the current 6-digit code from your
            authenticator. You may also use one unused
            recovery code. Successful verification stays
            valid for 10 minutes.
          </div>

          <form
            onSubmit={submit}
            className="space-y-4"
          >
            <label className="block">
              <div className="mb-2 text-xs font-medium text-white/55">
                Authenticator / recovery code
              </div>
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
                autoFocus
                autoComplete="one-time-code"
                className="h-12 w-full rounded-xl border border-white/[0.10] bg-[#0b0c10] px-4 font-mono text-sm tracking-[0.14em] text-white outline-none placeholder:text-white/20 focus:border-[#7657ff]/60 focus:ring-2 focus:ring-[#7657ff]/12"
                placeholder="123456"
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3 text-xs text-red-200/85">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#7657ff] px-4 text-sm font-semibold text-white transition hover:bg-[#846cff] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {busy
                ? "Verifying..."
                : "Verify and continue"}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-5">
            <Link
              href={safeCallback()}
              className="text-xs font-medium text-white/38 transition hover:text-white/70"
            >
              Cancel
            </Link>

            <span className="text-[10px] uppercase tracking-[0.12em] text-white/20">
              Recent 2FA required
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
