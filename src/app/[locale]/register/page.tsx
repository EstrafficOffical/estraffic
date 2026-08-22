"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, use } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

const trafficSources = [
  "Facebook",
  "Google / UAC",
  "SEO",
  "ASO",
  "In-app",
  "Native",
  "PPC",
  "TikTok",
  "Push",
  "Other",
];

const geoOptions = [
  "DE",
  "AT",
  "CH",
  "PL",
  "CZ",
  "RO",
  "IT",
  "ES",
  "PT",
  "BR",
  "MX",
  "CL",
  "IN",
  "JP",
  "CA",
  "AU",
];

const verticals = ["iGaming", "Nutra"];
const experienceOptions = ["Less than 1 year", "1–2 years", "2–4 years", "4+ years"];
const stepNames = ["Account", "Business", "Traffic", "Review"] as const;

type FormState = {
  fullName: string;
  email: string;
  telegram: string;
  password: string;
  confirmPassword: string;
  company: string;
  trafficSources: string[];
  mainGeos: string[];
  verticalInterests: string[];
  experience: string;
  estimatedMonthlyVolume: string;
  about: string;
};

const emptyForm: FormState = {
  fullName: "",
  email: "",
  telegram: "",
  password: "",
  confirmPassword: "",
  company: "",
  trafficSources: [],
  mainGeos: [],
  verticalInterests: [],
  experience: "",
  estimatedMonthlyVolume: "",
  about: "",
};

const inputCls =
  "w-full rounded-lg border border-white/[0.10] bg-[#111115] px-3.5 py-2.5 text-sm text-[#f7f7f8] outline-none placeholder:text-[#66666f] transition focus:border-[#7657ff]/60 focus:ring-2 focus:ring-[#7657ff]/15";
const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#7657ff] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#866cff] disabled:cursor-not-allowed disabled:opacity-50";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-[#18181d] px-4 py-2.5 text-sm font-medium text-[#f7f7f8] transition hover:border-[#7657ff]/40 hover:bg-[#202026]";

function Field({
  label,
  error,
  children,
  className = "",
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <div className="mb-1.5 text-xs font-medium text-[#b7b7c0]">{label}</div>
      {children}
      {error ? <div className="mt-1.5 text-xs text-rose-400">{error}</div> : null}
    </label>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "border-[#7657ff]/55 bg-[#7657ff]/15 text-[#a997ff]"
                : "border-white/[0.10] bg-[#111115] text-[#9999a2] hover:border-white/[0.18] hover:text-[#f7f7f8]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function RegisterPage(props: { params: Promise<{ locale: string }> }) {
  const params = use(props.params);
  const { locale } = params;
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const validate = useMemo(
    () => (targetStep: number) => {
      const next: Record<string, string> = {};
      if (targetStep === 0) {
        if (!form.fullName.trim()) next.fullName = "Enter your full name.";
        if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email address.";
        if (!form.telegram.trim()) next.telegram = "Telegram is required for account contact.";
        if (form.password.length < 8) next.password = "Use at least 8 characters.";
        if (form.password !== form.confirmPassword) next.confirmPassword = "Passwords do not match.";
      }
      if (targetStep === 1 && !form.company.trim()) next.company = "Enter your company or team name.";
      if (targetStep === 2) {
        if (!form.trafficSources.length) next.trafficSources = "Select at least one traffic source.";
        if (!form.mainGeos.length) next.mainGeos = "Select at least one GEO.";
        if (!form.verticalInterests.length) next.verticalInterests = "Select at least one vertical.";
        if (!form.experience) next.experience = "Select your experience level.";
        if (!form.estimatedMonthlyVolume.trim()) {
          next.estimatedMonthlyVolume = "Provide an expected monthly FTD / lead volume.";
        }
      }
      return next;
    },
    [form],
  );

  function nextStep() {
    const nextErrors = validate(step);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep((value) => Math.min(value + 1, 3));
  }

  async function submit() {
    if (!accepted) {
      setErrors({ accepted: "You must accept the Terms and Privacy Policy." });
      return;
    }

    setBusy(true);
    setServerError(null);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.fullName,
          telegram: form.telegram,
          company: form.company,
          trafficSources: form.trafficSources,
          mainGeos: form.mainGeos,
          verticalInterests: form.verticalInterests,
          experience: form.experience,
          estimatedMonthlyVolume: form.estimatedMonthlyVolume,
          about: form.about,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setServerError(data?.error || "We could not submit your application.");
        return;
      }

      router.push(`/${locale}/status?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch {
      setServerError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090b] px-4 py-10 text-[#f7f7f8]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(118,87,255,.16),transparent_38%)]" />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="mb-7 flex items-center justify-between">
          <Link href={`/${locale}`} className="text-xs font-semibold tracking-[0.22em] text-[#b8aaff]">
            NEXUS ALLIANCE
          </Link>
          <Link href={`/${locale}/login`} className={ghostBtn}>
            Partner login
          </Link>
        </div>

        <section className="rounded-2xl border border-white/[0.10] bg-[#0d0d10]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,.45)] sm:p-7">
          <div className="mb-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8b72ff]">Partner application</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Apply to NEXUS ALLIANCE</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#888891]">
              Registration is an application. Platform access is granted only after our partnerships team reviews your profile.
            </p>
          </div>

          <ol className="mb-7 grid grid-cols-4 gap-2">
            {stepNames.map((name, index) => {
              const done = index < step;
              const current = index === step;
              return (
                <li key={name}>
                  <button
                    type="button"
                    disabled={index > step}
                    onClick={() => index < step && setStep(index)}
                    className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${
                      current
                        ? "border-[#7657ff]/50 bg-[#7657ff]/12"
                        : done
                          ? "border-white/[0.10] bg-[#15151a]"
                          : "border-white/[0.07] bg-[#101014] opacity-55"
                    }`}
                  >
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md text-[10px] font-bold ${current ? "bg-[#7657ff]" : done ? "bg-emerald-500/15 text-emerald-400" : "bg-white/[0.06] text-[#777780]"}`}>
                      {done ? <Check className="size-3" /> : index + 1}
                    </span>
                    <span className="hidden truncate text-xs text-[#b7b7c0] sm:block">{name}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          {step === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.fullName} className="sm:col-span-2">
                <input className={inputCls} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Alex Mercer" />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" autoComplete="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
              </Field>
              <Field label="Telegram" error={errors.telegram}>
                <input className={inputCls} value={form.telegram} onChange={(e) => set("telegram", e.target.value)} placeholder="@username" />
              </Field>
              <Field label="Password" error={errors.password}>
                <input type="password" autoComplete="new-password" className={inputCls} value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
              <Field label="Confirm password" error={errors.confirmPassword}>
                <input type="password" autoComplete="new-password" className={inputCls} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
              </Field>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4">
              <Field label="Company / team" error={errors.company}>
                <input className={inputCls} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Your company or team" />
              </Field>
              <Field label="About your business">
                <textarea className={`${inputCls} min-h-32 resize-y`} value={form.about} onChange={(e) => set("about", e.target.value)} placeholder="Tell us what you run, your main acquisition model and what you want to scale." />
              </Field>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <Field label="Traffic sources" error={errors.trafficSources}>
                <ChipGroup options={trafficSources} value={form.trafficSources} onChange={(value) => set("trafficSources", value)} />
              </Field>
              <Field label="Main GEOs" error={errors.mainGeos}>
                <ChipGroup options={geoOptions} value={form.mainGeos} onChange={(value) => set("mainGeos", value)} />
              </Field>
              <Field label="Vertical interests" error={errors.verticalInterests}>
                <ChipGroup options={verticals} value={form.verticalInterests} onChange={(value) => set("verticalInterests", value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Experience" error={errors.experience}>
                  <select className={inputCls} value={form.experience} onChange={(e) => set("experience", e.target.value)}>
                    <option value="">Select experience</option>
                    {experienceOptions.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Expected monthly FTD / lead volume" error={errors.estimatedMonthlyVolume}>
                  <input className={inputCls} value={form.estimatedMonthlyVolume} onChange={(e) => set("estimatedMonthlyVolume", e.target.value)} placeholder="e.g. 50–100 FTD" />
                </Field>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.09] bg-[#111115] p-4">
                <Summary label="Name" value={form.fullName} />
                <Summary label="Email" value={form.email} />
                <Summary label="Telegram" value={form.telegram} />
                <Summary label="Company" value={form.company} />
                <Summary label="Traffic" value={form.trafficSources.join(" · ")} />
                <Summary label="GEOs" value={form.mainGeos.join(" · ")} />
                <Summary label="Verticals" value={form.verticalInterests.join(" · ")} />
                <Summary label="Experience" value={form.experience} />
                <Summary label="Monthly volume" value={form.estimatedMonthlyVolume} />
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-white/[0.09] bg-[#111115] p-4 text-xs leading-relaxed text-[#9999a2]">
                <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 size-4 accent-[#7657ff]" />
                <span>I confirm that the information is accurate and accept the Terms and Privacy Policy.</span>
              </label>
              {errors.accepted ? <div className="text-xs text-rose-400">{errors.accepted}</div> : null}
              {serverError ? <div className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-300">{serverError}</div> : null}
            </div>
          ) : null}

          <div className="mt-7 flex items-center justify-between border-t border-white/[0.08] pt-5">
            <button type="button" onClick={() => setStep((value) => Math.max(value - 1, 0))} disabled={step === 0 || busy} className={`${ghostBtn} disabled:opacity-40`}>
              <ArrowLeft className="size-4" /> Back
            </button>
            {step < 3 ? (
              <button type="button" onClick={nextStep} className={primaryBtn}>
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={busy} className={primaryBtn}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? "Submitting…" : "Submit application"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-white/[0.07] py-2.5 last:border-b-0">
      <span className="text-xs text-[#777780]">{label}</span>
      <span className="max-w-[65%] text-right text-xs text-[#d8d8de]">{value || "—"}</span>
    </div>
  );
}
