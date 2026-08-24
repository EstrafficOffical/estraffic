"use client";

import {
  FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  name?: string | null;
  telegram?: string | null;
  image?: string | null;
  role: string;
  status: string;
  tier: number;
};

type TwoFactorStatus = {
  enabled: boolean;
  requiredByRole: boolean;
  confirmedAt?: string | null;
  recoveryCodesRemaining: number;
  setupPending: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function PrivilegedProfile() {
  const pathname = usePathname();
  const locale =
    pathname.split("/")[1] || "en";

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [twoFactor, setTwoFactor] =
    useState<TwoFactorStatus | null>(
      null,
    );

  const [name, setName] =
    useState("");
  const [telegram, setTelegram] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");
  const [newPassword, setNewPassword] =
    useState("");
  const [repeatPassword, setRepeatPassword] =
    useState("");

  const [loading, setLoading] =
    useState(true);
  const [identityMessage, setIdentityMessage] =
    useState("");
  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [savingIdentity, startIdentityTransition] =
    useTransition();
  const [savingPassword, startPasswordTransition] =
    useTransition();

  async function load() {
    const [profileResponse, twoFactorResponse] =
      await Promise.all([
        fetch("/api/profile", {
          cache: "no-store",
        }),
        fetch("/api/profile/2fa/status", {
          cache: "no-store",
        }),
      ]);

    const profileJson =
      await profileResponse
        .json()
        .catch(() => ({}));

    const twoFactorJson =
      await twoFactorResponse
        .json()
        .catch(() => ({}));

    if (
      profileResponse.ok &&
      profileJson?.user
    ) {
      setProfile(profileJson.user);
      setName(
        profileJson.user.name ?? "",
      );
      setTelegram(
        profileJson.user.telegram ?? "",
      );
    }

    if (
      twoFactorResponse.ok &&
      twoFactorJson?.ok
    ) {
      setTwoFactor({
        enabled: Boolean(
          twoFactorJson.enabled,
        ),
        requiredByRole: Boolean(
          twoFactorJson.requiredByRole,
        ),
        confirmedAt:
          twoFactorJson.confirmedAt ??
          null,
        recoveryCodesRemaining: Number(
          twoFactorJson
            .recoveryCodesRemaining ?? 0,
        ),
        setupPending: Boolean(
          twoFactorJson.setupPending,
        ),
      });
    }
  }

  useEffect(() => {
    load().finally(() =>
      setLoading(false),
    );
  }, []);

  function saveIdentity(
    event: FormEvent,
  ) {
    event.preventDefault();

    startIdentityTransition(
      async () => {
        setIdentityMessage("");

        const response =
          await fetch("/api/profile", {
            method: "PATCH",
            headers: {
              "content-type":
                "application/json",
            },
            body: JSON.stringify({
              name,
              telegram,
            }),
          });

        const json =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          setIdentityMessage(
            json?.error === "DUPLICATE"
              ? "Could not save profile."
              : "Could not save profile.",
          );
          return;
        }

        setIdentityMessage(
          "Profile updated.",
        );

        await load();
      },
    );
  }

  function changePassword(
    event: FormEvent,
  ) {
    event.preventDefault();

    startPasswordTransition(
      async () => {
        setPasswordMessage("");

        if (
          newPassword !==
          repeatPassword
        ) {
          setPasswordMessage(
            "New passwords do not match.",
          );
          return;
        }

        if (
          newPassword.length < 8 ||
          newPassword.length > 128
        ) {
          setPasswordMessage(
            "New password must be between 8 and 128 characters.",
          );
          return;
        }

        const response =
          await fetch(
            "/api/profile/change-password",
            {
              method: "POST",
              headers: {
                "content-type":
                  "application/json",
              },
              body: JSON.stringify({
                currentPassword,
                newPassword,
              }),
            },
          );

        const json =
          await response
            .json()
            .catch(() => ({}));

        if (!response.ok) {
          setPasswordMessage(
            json?.error ===
              "WRONG_PASSWORD"
              ? "Current password is incorrect."
              : "Password change failed.",
          );
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setRepeatPassword("");

        setPasswordMessage(
          "Password changed. Existing sessions are revoked by the security policy.",
        );
      },
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] p-8 text-white">
        <div className="mx-auto max-w-[1500px] rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-10 text-sm text-white/35">
          Loading privileged profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#08090d] p-8 text-white">
        <div className="mx-auto max-w-[1500px] rounded-2xl border border-white/[0.08] bg-[#0d0f14] p-10 text-sm text-white/35">
          Profile unavailable.
        </div>
      </div>
    );
  }

  const privileged =
    profile.role === "OWNER" ||
    profile.role === "ADMIN";

  if (!privileged) {
    return null;
  }

  const protectedAccount =
    Boolean(twoFactor?.enabled) &&
    Boolean(
      twoFactor?.requiredByRole,
    );

  return (
    <div className="min-h-screen bg-[#08090d] px-5 py-8 text-white md:px-8 lg:px-10">
      <div className="mx-auto w-full max-w-[1600px]">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8068ff]">
              Privileged account
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-[-0.04em]">
                Profile
              </h1>

              <Badge
                tone="accent"
              >
                {profile.role}
              </Badge>

              <Badge
                tone={
                  protectedAccount
                    ? "success"
                    : "warning"
                }
              >
                {protectedAccount
                  ? "Protected"
                  : "Security review"}
              </Badge>
            </div>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/42">
              Identity, access and security
              settings for a privileged NEXUS
              staff account.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/admin/audit-log`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Audit Log
            </Link>

            <Link
              href={`/${locale}/admin/team`}
              className="rounded-xl border border-white/[0.09] bg-white/[0.025] px-4 py-2.5 text-xs font-semibold text-white/55 transition hover:bg-white/[0.05] hover:text-white"
            >
              Team & Roles
            </Link>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Role"
            value={profile.role}
            accent
          />

          <Metric
            label="Account status"
            value={
              profile.status ===
              "APPROVED"
                ? "ACTIVE"
                : profile.status
            }
            positive={
              profile.status ===
              "APPROVED"
            }
          />

          <Metric
            label="2FA"
            value={
              twoFactor?.enabled
                ? "ENABLED"
                : "NOT ENABLED"
            }
            positive={
              Boolean(
                twoFactor?.enabled,
              )
            }
            warning={
              !twoFactor?.enabled
            }
          />

          <Metric
            label="Recovery codes"
            value={String(
              twoFactor
                ?.recoveryCodesRemaining ??
                0,
            )}
            warning={
              Boolean(
                twoFactor?.enabled &&
                  (twoFactor
                    ?.recoveryCodesRemaining ??
                    0) <= 2,
              )
            }
          />
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <SectionHeader
              title="Account information"
              description="Public staff identity and account-level access information."
            />

            <form
              onSubmit={saveIdentity}
              className="space-y-5 p-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target
                          .value,
                      )
                    }
                    maxLength={191}
                    className={inputClass}
                  />
                </Field>

                <Field label="Telegram">
                  <input
                    value={telegram}
                    onChange={(event) =>
                      setTelegram(
                        event.target
                          .value,
                      )
                    }
                    maxLength={191}
                    placeholder="@username"
                    className={inputClass}
                  />
                </Field>

                <Field
                  label="Email"
                  description="Read only in the privileged workspace."
                >
                  <input
                    value={profile.email}
                    readOnly
                    className={`${inputClass} cursor-not-allowed text-white/38`}
                  />
                </Field>

                <Field
                  label="Account ID"
                  description="Internal immutable identifier."
                >
                  <input
                    value={profile.id}
                    readOnly
                    className={`${inputClass} cursor-not-allowed font-mono text-[10px] text-white/32`}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-white/35">
                  {identityMessage ||
                    "Name and Telegram can be updated here."}
                </div>

                <button
                  type="submit"
                  disabled={
                    savingIdentity
                  }
                  className="rounded-xl bg-[#7657ff] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff] disabled:opacity-50"
                >
                  {savingIdentity
                    ? "Saving..."
                    : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <SectionHeader
              title="Security posture"
              description="Privileged-account controls currently verified by NEXUS."
            />

            <div className="space-y-3 p-5">
              <SecurityRow
                label="Two-factor authentication"
                value={
                  twoFactor?.enabled
                    ? "Enabled"
                    : "Not enabled"
                }
                state={
                  twoFactor?.enabled
                    ? "good"
                    : "warn"
                }
              />

              <SecurityRow
                label="Role enforcement"
                value={
                  twoFactor
                    ?.requiredByRole
                    ? `Mandatory for ${profile.role}`
                    : "Not mandatory"
                }
                state={
                  twoFactor
                    ?.requiredByRole
                    ? "good"
                    : "warn"
                }
              />

              <SecurityRow
                label="2FA confirmed"
                value={formatDate(
                  twoFactor?.confirmedAt,
                )}
              />

              <SecurityRow
                label="Recovery codes remaining"
                value={String(
                  twoFactor
                    ?.recoveryCodesRemaining ??
                    0,
                )}
                state={
                  twoFactor?.enabled &&
                  (twoFactor
                    ?.recoveryCodesRemaining ??
                    0) > 2
                    ? "good"
                    : "warn"
                }
              />

              <SecurityRow
                label="Sensitive actions"
                value="Fresh 2FA step-up required"
                state="good"
              />

              <div className="rounded-xl border border-[#7657ff]/20 bg-[#7657ff]/[0.055] p-4">
                <div className="text-xs font-semibold text-[#a694ff]">
                  Privileged security policy
                </div>

                <p className="mt-2 text-[11px] leading-5 text-white/38">
                  Role changes, sensitive
                  financial operations, secret
                  access and destructive admin
                  actions require recent
                  re-authentication.
                </p>
              </div>

              {!twoFactor?.enabled ? (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-200/80">
                  This privileged account is
                  missing mandatory 2FA. The
                  account should not be used for
                  sensitive administration until
                  2FA is restored.
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <SectionHeader
              title="Change password"
              description="Changing the password revokes existing authenticated sessions."
            />

            <form
              onSubmit={changePassword}
              className="space-y-5 p-5"
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <Field label="Current password">
                  <input
                    type="password"
                    value={
                      currentPassword
                    }
                    onChange={(event) =>
                      setCurrentPassword(
                        event.target
                          .value,
                      )
                    }
                    autoComplete="current-password"
                    className={inputClass}
                  />
                </Field>

                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target
                          .value,
                      )
                    }
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>

                <Field label="Repeat new password">
                  <input
                    type="password"
                    value={repeatPassword}
                    onChange={(event) =>
                      setRepeatPassword(
                        event.target
                          .value,
                      )
                    }
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`text-xs ${
                    passwordMessage.includes(
                      "failed",
                    ) ||
                    passwordMessage.includes(
                      "incorrect",
                    ) ||
                    passwordMessage.includes(
                      "do not match",
                    )
                      ? "text-rose-300/80"
                      : "text-white/35"
                  }`}
                >
                  {passwordMessage ||
                    "Password length: 8-128 characters."}
                </div>

                <button
                  type="submit"
                  disabled={
                    savingPassword ||
                    !currentPassword ||
                    !newPassword ||
                    !repeatPassword
                  }
                  className="rounded-xl border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {savingPassword
                    ? "Changing..."
                    : "Change password"}
                </button>
              </div>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
            <SectionHeader
              title="Account safeguards"
              description="How this privileged account is treated by the platform."
            />

            <div className="divide-y divide-white/[0.06]">
              <Safeguard
                title="Mandatory 2FA"
                text="OWNER and ADMIN accounts require authenticator verification."
              />

              <Safeguard
                title="Step-up verification"
                text="High-risk administrative actions require a fresh verification."
              />

              <Safeguard
                title="Session revocation"
                text="Password and security changes invalidate existing authenticated sessions."
              />

              <Safeguard
                title="Audit trail"
                text="Administrative and security events are recorded in the Audit Log."
              />
            </div>

            <div className="flex flex-wrap gap-2 border-t border-white/[0.07] p-5">
              <Link
                href={`/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
                  pathname,
                )}`}
                className="rounded-xl border border-[#7657ff]/25 bg-[#7657ff]/[0.07] px-4 py-2.5 text-xs font-semibold text-[#a694ff] transition hover:bg-[#7657ff]/[0.12]"
              >
                Verify with 2FA
              </Link>

              <Link
                href={`/${locale}/admin/audit-log`}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white/50 transition hover:bg-white/[0.04] hover:text-white"
              >
                Review security events
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-xs text-white outline-none transition placeholder:text-white/22 focus:border-[#7657ff]/45";

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone:
    | "accent"
    | "success"
    | "warning";
}) {
  const classes =
    tone === "success"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : tone === "warning"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : "border-[#7657ff]/25 bg-[#7657ff]/10 text-[#a694ff]";

  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${classes}`}
    >
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  accent = false,
  positive = false,
  warning = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? "border-[#7657ff]/30 bg-[#7657ff]/[0.065]"
          : "border-white/[0.08] bg-[#0d0f14]"
      }`}
    >
      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
        {label}
      </div>

      <div
        className={`mt-3 truncate text-[22px] font-semibold tracking-[-0.03em] ${
          positive
            ? "text-emerald-300"
            : warning
              ? "text-amber-300"
              : "text-white"
        }`}
      >
        {value}
      </div>

      <div className="mt-2 text-[10px] text-white/22">
        Live NEXUS account state
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/[0.07] px-5 py-4">
      <h2 className="text-sm font-semibold">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-white/32">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-medium text-white/42">
        {label}
      </span>

      {children}

      {description ? (
        <span className="text-[9px] leading-4 text-white/22">
          {description}
        </span>
      ) : null}
    </label>
  );
}

function SecurityRow({
  label,
  value,
  state = "neutral",
}: {
  label: string;
  value: string;
  state?:
    | "neutral"
    | "good"
    | "warn";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-black/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-white/42">
        {label}
      </div>

      <div
        className={`text-xs font-semibold ${
          state === "good"
            ? "text-emerald-300"
            : state === "warn"
              ? "text-amber-300"
              : "text-white/68"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Safeguard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="px-5 py-4">
      <div className="text-xs font-semibold text-white/72">
        {title}
      </div>

      <div className="mt-1 text-[11px] leading-5 text-white/30">
        {text}
      </div>
    </div>
  );
}