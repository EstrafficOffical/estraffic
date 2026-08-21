"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type ChallengeState = {
  token: string;
  expiresAt: string;
};

export default function LoginPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = params;
  const qs = useSearchParams();

  const [submitting, setSubmitting] =
    useState(false);
  const [localError, setLocalError] =
    useState<string | null>(null);

  const [challenge, setChallenge] =
    useState<ChallengeState | null>(null);
  const [verificationCode, setVerificationCode] =
    useState("");

  const callbackUrl =
    qs.get("callbackUrl") || `/${locale}`;

  async function finishSignIn(
    input: Record<string, string>,
  ) {
    const result = await signIn("credentials", {
      ...input,
      redirect: false,
      callbackUrl,
    });

    if (!result || result.error) {
      throw new Error(
        result?.error || "CredentialsSignin",
      );
    }

    window.location.assign(
      result.url || `/${locale}`,
    );
  }

  async function onSubmit(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const email = String(
      fd.get("email") || "",
    ).trim();
    const password = String(
      fd.get("password") || "",
    );

    if (!email || !password) {
      setLocalError(
        "Enter your email and password.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/auth/2fa/preauth",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        if (
          json?.error ===
          "TWO_FACTOR_SETUP_REQUIRED"
        ) {
          setLocalError(
            "Two-factor authentication is required for this staff account. Contact the NEXUS owner before signing in.",
          );
        } else {
          setLocalError(
            "Incorrect email or password.",
          );
        }

        setSubmitting(false);
        return;
      }

      if (json?.requiresTwoFactor) {
        setChallenge({
          token: String(
            json.challengeToken || "",
          ),
          expiresAt: String(
            json.expiresAt || "",
          ),
        });
        setVerificationCode("");
        setSubmitting(false);
        return;
      }

      await finishSignIn({
        email,
        password,
      });
    } catch (error) {
      console.error(
        "[LOGIN] first stage failed",
        error,
      );
      setLocalError(
        "We could not sign you in. Please try again.",
      );
      setSubmitting(false);
    }
  }

  async function onVerify(
    e: React.FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!challenge) return;

    setLocalError(null);
    setSubmitting(true);

    const code = verificationCode.trim();

    if (!code) {
      setLocalError(
        "Enter your authenticator or recovery code.",
      );
      setSubmitting(false);
      return;
    }

    try {
      await finishSignIn({
        challengeToken: challenge.token,
        verificationCode: code,
      });
    } catch (error) {
      console.error(
        "[LOGIN] two-factor stage failed",
        error,
      );
      setLocalError(
        "The two-factor code is invalid or the challenge expired. Try again.",
      );
      setSubmitting(false);
    }
  }

  const urlError = qs.get("error");

  const mergedError =
    localError ||
    (urlError === "CredentialsSignin"
      ? "Incorrect email or password."
      : urlError === "TwoFactorRequired"
        ? "Sign in again and complete two-factor authentication."
        : urlError
          ? "Sign-in failed. Please try again."
          : null);

  const inputClass =
    "h-12 w-full rounded-xl border border-white/[0.10] bg-[#0b0c10] px-4 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-[#7657ff]/60 focus:ring-2 focus:ring-[#7657ff]/12";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07080b] text-[#f7f7f8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(118,87,255,.15),transparent_32%),radial-gradient(circle_at_80%_72%,rgba(118,87,255,.07),transparent_30%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:64px_64px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1500px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="group inline-flex items-center gap-3"
          >
            <span className="grid size-10 place-items-center rounded-xl border border-[#7657ff]/45 bg-[#7657ff]/10 text-sm font-bold text-[#9a87ff] transition group-hover:border-[#7657ff]/70">
              N
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.20em] text-white">
                NEXUS
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.34em] text-white/35">
                ALLIANCE
              </span>
            </span>
          </Link>

          <Link
            href={`/${locale}/register`}
            className="rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/65 transition hover:border-[#7657ff]/35 hover:bg-white/[0.05] hover:text-white"
          >
            Apply to join
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <section className="hidden max-w-2xl lg:block">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8068ff]">
              Performance partnerships
            </div>

            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.02] tracking-[-0.055em] xl:text-6xl">
              Built to scale.
              <span className="mt-2 block text-white/42">
                Operated with precision.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/38">
              Access approved offers, live tracking,
              conversion analytics and finance from one
              performance workspace.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <Feature
                label="Live tracking"
                value="Click → FTD"
              />
              <Feature
                label="Commercial terms"
                value="Frozen"
              />
              <Feature
                label="Attribution"
                value="S2S ready"
              />
            </div>

            <div className="mt-10 border-l border-[#7657ff]/35 pl-4 text-xs leading-5 text-white/30">
              NEXUS ALLIANCE partner access is available
              only to approved accounts.
            </div>
          </section>

          <section className="mx-auto w-full max-w-[520px]">
            <div className="rounded-3xl border border-white/[0.09] bg-[#0d0f14]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,.55)] backdrop-blur-xl sm:p-7">
              <div className="mb-7">
                <div className="text-[10px] font-semibold uppercase tracking-[0.20em] text-[#8068ff]">
                  {challenge
                    ? "Security verification"
                    : "Partner access"}
                </div>

                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
                  {challenge
                    ? "Verify it is you"
                    : "Sign in to NEXUS"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  {challenge
                    ? "Enter the current 6-digit authenticator code or one unused recovery code."
                    : "Use the credentials connected to your approved NEXUS account."}
                </p>
              </div>

              {!challenge ? (
                <form
                  onSubmit={onSubmit}
                  className="space-y-4"
                >
                  <label className="block">
                    <div className="mb-2 text-xs font-medium text-white/55">
                      Email
                    </div>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      className={inputClass}
                      placeholder="you@company.com"
                      required
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-white/55">
                        Password
                      </span>
                      <Link
                        href={`/${locale}/auth/forgot`}
                        className="text-[11px] font-medium text-[#8f7aff] transition hover:text-[#aa9bff]"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      className={inputClass}
                      placeholder="Your password"
                      required
                    />
                  </label>

                  {mergedError ? (
                    <ErrorBox>
                      {mergedError}
                    </ErrorBox>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 flex h-12 w-full items-center justify-center rounded-xl bg-[#7657ff] px-4 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(118,87,255,.18)] transition hover:bg-[#846cff] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {submitting
                      ? "Checking..."
                      : "Continue"}
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={onVerify}
                  className="space-y-4"
                >
                  <label className="block">
                    <div className="mb-2 text-xs font-medium text-white/55">
                      Authenticator / recovery code
                    </div>

                    <input
                      value={verificationCode}
                      onChange={(event) =>
                        setVerificationCode(
                          event.target.value,
                        )
                      }
                      autoFocus
                      autoComplete="one-time-code"
                      className={`${inputClass} font-mono tracking-[0.16em]`}
                      placeholder="123456"
                      required
                    />
                  </label>

                  <div className="rounded-xl border border-white/[0.07] bg-black/10 px-3.5 py-3 text-[10px] leading-5 text-white/28">
                    The login challenge expires in five
                    minutes. Recovery codes are one-time
                    use.
                  </div>

                  {mergedError ? (
                    <ErrorBox>
                      {mergedError}
                    </ErrorBox>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-[#7657ff] px-4 text-sm font-semibold text-white transition hover:bg-[#846cff] disabled:opacity-55"
                  >
                    {submitting
                      ? "Verifying..."
                      : "Verify and sign in"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChallenge(null);
                      setVerificationCode("");
                      setLocalError(null);
                    }}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.09] text-xs font-semibold text-white/48 transition hover:text-white"
                  >
                    Use another account
                  </button>
                </form>
              )}

              {!challenge ? (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/[0.07]" />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-white/20">
                      New partner
                    </span>
                    <div className="h-px flex-1 bg-white/[0.07]" />
                  </div>

                  <Link
                    href={`/${locale}/register`}
                    className="flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 text-xs font-semibold text-white/65 transition hover:border-[#7657ff]/35 hover:bg-[#7657ff]/[0.06] hover:text-white"
                  >
                    Apply to NEXUS ALLIANCE
                  </Link>

                  <div className="mt-6 rounded-xl border border-white/[0.06] bg-black/10 px-3.5 py-3 text-[10px] leading-5 text-white/25">
                    Internal staff and approved affiliates
                    use the same secure sign-in. Access and
                    available workspace modules are
                    determined by account role.
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-5 text-center text-[10px] tracking-[0.04em] text-white/18">
              NEXUS ALLIANCE · PERFORMANCE WORKSPACE
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ErrorBox({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-3.5 py-3 text-xs text-red-200/85">
      {children}
    </div>
  );
}

function Feature({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-white/27">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-white/72">
        {value}
      </div>
    </div>
  );
}
