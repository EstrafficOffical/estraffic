"use client";

import { useEffect, useState, useTransition } from "react";
import {
  EmptyState,
  PageHeader,
  Panel,
  PanelHeader,
  Pill,
} from "@/app/components/NexusPageKit";

type Profile = {
  id: string;
  email: string;
  name?: string | null;
  telegram?: string | null;
  image?: string | null;
  role: string;
  status: string;
  tier: number;
  assignedManager?: {
    name?: string | null;
    email: string;
    telegram?: string | null;
  } | null;
  application?: {
    company?: string | null;
    trafficSources: string[];
    mainGeos: string[];
    verticalInterests: string[];
    experience?: string | null;
    estimatedMonthlyVolume?: string | null;
    about?: string | null;
  } | null;
};

type TwoFactorStatus = {
  enabled: boolean;
  requiredByRole: boolean;
  confirmedAt?: string | null;
  recoveryCodesRemaining: number;
  setupPending: boolean;
};

type SetupState = {
  qrDataUrl: string;
  manualKey: string;
  expiresAt: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorStatus | null>(null);

  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [setupPassword, setSetupPassword] = useState("");
  const [setupState, setSetupState] = useState<SetupState | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const [securityPending, startSecurityTransition] = useTransition();

  async function load() {
    const [profileResponse, twoFactorResponse] = await Promise.all([
      fetch("/api/profile", { cache: "no-store" }),
      fetch("/api/profile/2fa/status", { cache: "no-store" }),
    ]);

    const profileJson = await profileResponse.json().catch(() => ({}));
    const twoFactorJson = await twoFactorResponse.json().catch(() => ({}));

    if (profileJson?.user) {
      setProfile(profileJson.user);
      setName(profileJson.user.name ?? "");
      setTelegram(profileJson.user.telegram ?? "");
    }

    if (twoFactorResponse.ok && twoFactorJson?.ok) {
      setTwoFactor({
        enabled: Boolean(twoFactorJson.enabled),
        requiredByRole: Boolean(twoFactorJson.requiredByRole),
        confirmedAt: twoFactorJson.confirmedAt ?? null,
        recoveryCodesRemaining: Number(
          twoFactorJson.recoveryCodesRemaining ?? 0,
        ),
        setupPending: Boolean(twoFactorJson.setupPending),
      });
    }
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  function save() {
    startTransition(async () => {
      setMessage(null);

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name,
          telegram,
        }),
      });

      if (!response.ok) {
        setMessage("Could not save profile.");
        return;
      }

      if (currentPassword || newPassword || repeatPassword) {
        if (newPassword !== repeatPassword) {
          setMessage("New passwords do not match.");
          return;
        }

        if (newPassword.length < 8 || newPassword.length > 128) {
          setMessage("New password must be between 8 and 128 characters.");
          return;
        }

        const passwordResponse = await fetch(
          "/api/profile/change-password",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
            }),
          },
        );

        if (!passwordResponse.ok) {
          setMessage("Profile saved, but password change failed.");
          return;
        }

        setCurrentPassword("");
        setNewPassword("");
        setRepeatPassword("");
      }

      setMessage("Changes saved.");
      await load();
    });
  }

  function beginTwoFactorSetup() {
    startSecurityTransition(async () => {
      setSecurityMessage(null);
      setRecoveryCodes([]);

      const response = await fetch("/api/profile/2fa/setup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: setupPassword,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSecurityMessage(
          json?.error === "WRONG_PASSWORD"
            ? "Current password is incorrect."
            : "Could not start authenticator setup.",
        );
        return;
      }

      setSetupState({
        qrDataUrl: json.qrDataUrl,
        manualKey: json.manualKey,
        expiresAt: json.expiresAt,
      });
      setTotpCode("");
      setSecurityMessage(
        "Scan the QR code, then confirm the current 6-digit code.",
      );
    });
  }

  function confirmTwoFactor() {
    startSecurityTransition(async () => {
      setSecurityMessage(null);

      const response = await fetch("/api/profile/2fa/confirm", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code: totpCode,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSecurityMessage(
          json?.error === "SETUP_EXPIRED"
            ? "Setup expired. Start again."
            : "The authenticator code is invalid.",
        );
        return;
      }

      setRecoveryCodes(
        Array.isArray(json.recoveryCodes) ? json.recoveryCodes : [],
      );
      setSetupState(null);
      setTotpCode("");
      setSetupPassword("");
      setSecurityMessage(
        "Two-factor authentication is enabled. Save the recovery codes now.",
      );

      await load();
    });
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes.length) return;

    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setSecurityMessage("Recovery codes copied. Store them somewhere safe.");
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Account"
        title="Profile"
        subtitle="Account details, application traffic profile, assigned manager and security."
        actions={
          <button
            onClick={save}
            disabled={pending || loading}
            className="rounded-lg bg-[#7657ff] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
        }
      />

      <div className="space-y-5 p-5 md:p-8">
        {loading ? (
          <Panel>
            <EmptyState title="Loading profile..." />
          </Panel>
        ) : !profile ? (
          <Panel>
            <EmptyState title="Profile unavailable" />
          </Panel>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
              <Panel>
                <PanelHeader title="Account information" />

                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Telegram">
                    <input
                      value={telegram}
                      onChange={(event) => setTelegram(event.target.value)}
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      value={profile.email}
                      readOnly
                      className={`${inputClass} text-white/35`}
                    />
                  </Field>

                  <Field label="Access">
                    <div className="flex h-10 items-center gap-2">
                      <Pill tone="success">{profile.status}</Pill>
                      <Pill tone="accent">{profile.role}</Pill>
                      {profile.role === "USER" ? (
                        <Pill>Tier {profile.tier}</Pill>
                      ) : null}
                    </div>
                  </Field>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Assigned manager"
                  description="Your primary NEXUS contact."
                />

                <div className="p-5">
                  {profile.assignedManager ? (
                    <>
                      <div className="text-sm font-semibold text-white/82">
                        {profile.assignedManager.name || "NEXUS Manager"}
                      </div>
                      <div className="mt-1 text-xs text-white/38">
                        {profile.assignedManager.email}
                      </div>
                      {profile.assignedManager.telegram ? (
                        <div className="mt-3 inline-flex rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs text-white/55">
                          {profile.assignedManager.telegram}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <EmptyState
                      title="No manager assigned yet"
                      description="Staff can assign a personal manager from the admin workspace."
                    />
                  )}
                </div>
              </Panel>
            </div>

            <Panel>
              <PanelHeader
                title="Traffic profile"
                description="The information submitted with your affiliate application."
              />

              {profile.application ? (
                <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
                  <Info
                    label="Company / team"
                    value={profile.application.company}
                  />
                  <Info
                    label="Main GEOs"
                    value={profile.application.mainGeos.join(", ")}
                  />
                  <Info
                    label="Traffic sources"
                    value={profile.application.trafficSources.join(", ")}
                  />
                  <Info
                    label="Vertical interests"
                    value={profile.application.verticalInterests.join(", ")}
                  />
                  <Info
                    label="Experience"
                    value={profile.application.experience}
                  />
                  <Info
                    label="Expected monthly volume"
                    value={profile.application.estimatedMonthlyVolume}
                  />
                  {profile.application.about ? (
                    <div className="sm:col-span-2 xl:col-span-3">
                      <Info
                        label="About"
                        value={profile.application.about}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <EmptyState title="No application profile attached" />
              )}
            </Panel>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <Panel>
                <PanelHeader
                  title="Password"
                  description="Changing your password always requires the current password."
                />

                <div className="grid gap-4 p-5">
                  <Field label="Current password">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="New password">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Confirm new password">
                    <input
                      type="password"
                      value={repeatPassword}
                      onChange={(event) =>
                        setRepeatPassword(event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  <div className="text-[10px] leading-5 text-white/28">
                    Password length: 8-128 characters.
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Two-factor authentication"
                  description="Authenticator-app TOTP with one-time recovery codes."
                  action={
                    twoFactor?.enabled ? (
                      <Pill tone="success">Enabled</Pill>
                    ) : (
                      <Pill tone="warning">Not enabled</Pill>
                    )
                  }
                />

                <div className="space-y-4 p-5">
                  <div className="rounded-xl border border-white/[0.07] bg-black/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-white/80">
                        {twoFactor?.enabled
                          ? "Authenticator protection active"
                          : "Authenticator protection inactive"}
                      </span>

                      {twoFactor?.requiredByRole ? (
                        <Pill tone="accent">Required for {profile.role}</Pill>
                      ) : (
                        <Pill>Optional for {profile.role}</Pill>
                      )}
                    </div>

                    <div className="mt-2 text-xs leading-5 text-white/35">
                      {twoFactor?.enabled
                        ? `${twoFactor.recoveryCodesRemaining} recovery codes remain. Login enforcement will be activated in the next security step.`
                        : "Set up Google Authenticator, Microsoft Authenticator, 1Password or another TOTP-compatible app."}
                    </div>
                  </div>

                  {!twoFactor?.enabled && !setupState ? (
                    <div className="space-y-3">
                      <Field label="Current password">
                        <input
                          type="password"
                          value={setupPassword}
                          onChange={(event) =>
                            setSetupPassword(event.target.value)
                          }
                          className={inputClass}
                          placeholder="Required to start setup"
                        />
                      </Field>

                      <button
                        type="button"
                        onClick={beginTwoFactorSetup}
                        disabled={securityPending || !setupPassword}
                        className="h-10 rounded-lg bg-[#7657ff] px-4 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {securityPending
                          ? "Preparing..."
                          : "Set up authenticator"}
                      </button>
                    </div>
                  ) : null}

                  {setupState ? (
                    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
                      <div className="rounded-2xl bg-white p-3">
                        <img
                          src={setupState.qrDataUrl}
                          alt="NEXUS two-factor QR code"
                          className="h-auto w-full"
                        />
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
                            Manual setup key
                          </div>
                          <div className="mt-2 break-all rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 font-mono text-xs text-white/60">
                            {setupState.manualKey}
                          </div>
                        </div>

                        <Field label="6-digit authenticator code">
                          <input
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={totpCode}
                            onChange={(event) =>
                              setTotpCode(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
                              )
                            }
                            className={inputClass}
                            placeholder="123456"
                          />
                        </Field>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={confirmTwoFactor}
                            disabled={
                              securityPending || totpCode.length !== 6
                            }
                            className="h-10 rounded-lg bg-emerald-500/15 px-4 text-xs font-semibold text-emerald-300 disabled:opacity-40"
                          >
                            Confirm and enable
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSetupState(null);
                              setTotpCode("");
                              setSecurityMessage(null);
                            }}
                            className="h-10 rounded-lg border border-white/[0.08] px-4 text-xs text-white/50"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="text-[10px] text-white/25">
                          Setup expires at{" "}
                          {new Date(setupState.expiresAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {recoveryCodes.length ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.055] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-amber-200">
                            Save these recovery codes now
                          </div>
                          <div className="mt-1 text-xs text-amber-100/45">
                            Each code is one-time use. They will not be shown
                            again.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={copyRecoveryCodes}
                          className="rounded-lg border border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-200"
                        >
                          Copy codes
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {recoveryCodes.map((code) => (
                          <div
                            key={code}
                            className="rounded-lg border border-white/[0.06] bg-black/15 px-3 py-2 font-mono text-xs text-white/65"
                          >
                            {code}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {securityMessage ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs text-white/60">
                      {securityMessage}
                    </div>
                  ) : null}
                </div>
              </Panel>
            </div>

            {message ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3 text-xs text-white/60">
                {message}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 text-[13px] text-white outline-none focus:border-[#7657ff]/40";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">
        {label}
      </span>
      {children}
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
      <div className="text-[9px] uppercase tracking-[0.13em] text-white/28">
        {label}
      </div>
      <div className="mt-2 text-xs leading-5 text-white/55">
        {value || "—"}
      </div>
    </div>
  );
}
