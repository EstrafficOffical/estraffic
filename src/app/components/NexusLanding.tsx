"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Blocks,
  CheckCircle2,
  FileCheck2,
  Gauge,
  Globe2,
  Handshake,
  LineChart,
  Menu,
  Rocket,
  ShieldCheck,
  Timer,
  UserRoundCheck,
  Wallet,
  X,
} from "lucide-react";

const ACCENT = "#7657ff";

const sectionLinks = [
  { label: "Platform", href: "#platform" },
  { label: "Verticals", href: "#verticals" },
  { label: "Reach", href: "#reach" },
  { label: "How it works", href: "#how-it-works" },
];

const provisions = [
  {
    icon: Blocks,
    title: "High-performing offers",
    body: "A curated set of direct commercial relationships, reviewed for stability and payout reliability before they reach partners.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent tracking",
    body: "Click-level attribution with a clear event lifecycle, so every registration and deposit can be traced end to end.",
  },
  {
    icon: LineChart,
    title: "Real-time visibility",
    body: "Performance, conversion quality and validation status update continuously — no waiting for a weekly export.",
  },
  {
    icon: UserRoundCheck,
    title: "Dedicated management",
    body: "Every approved partner works with one named account manager who owns terms, scaling and escalation.",
  },
  {
    icon: Wallet,
    title: "Structured payouts",
    body: "Defined validation periods, predictable schedules and a full ledger behind every balance movement.",
  },
  {
    icon: Handshake,
    title: "Long-term partnerships",
    body: "Commercial terms are versioned and documented. Changes are agreed, not applied silently.",
  },
];

const steps = [
  { icon: FileCheck2, title: "Apply", body: "Submit your traffic profile and business details." },
  { icon: UserRoundCheck, title: "Get reviewed", body: "Our team assesses fit, GEOs and quality." },
  { icon: CheckCircle2, title: "Receive access", body: "Approved partners get platform access." },
  { icon: Blocks, title: "Choose opportunities", body: "Select from offers approved for you." },
  { icon: Rocket, title: "Launch traffic", body: "Run with clean links and structured sub IDs." },
  { icon: BarChart3, title: "Track performance", body: "Monitor quality and validation live." },
  { icon: Wallet, title: "Get paid", body: "Request payouts on an agreed schedule." },
];

const whyNexus = [
  { icon: Gauge, title: "Performance-focused", body: "Decisions are made on measured quality, not promises." },
  { icon: ShieldCheck, title: "Selective partnerships", body: "We onboard deliberately and keep the network small." },
  { icon: FileCheck2, title: "Clear commercial terms", body: "Versioned terms, documented conditions, no ambiguity." },
  { icon: UserRoundCheck, title: "Dedicated support", body: "Direct access to a manager who knows your account." },
  { icon: BarChart3, title: "Transparent reporting", body: "The same numbers you see are the numbers we settle on." },
  { icon: Timer, title: "Predictable validation", body: "Defined review windows and consistent payout timing." },
];

const regions = [
  { region: "Europe", note: "Tier-1 and CEE markets" },
  { region: "LATAM", note: "Established demand across the region" },
  { region: "Asia", note: "Selected high-volume markets" },
  { region: "MENA", note: "Targeted market coverage" },
  { region: "North America", note: "Regulated market focus" },
  { region: "Africa", note: "Emerging market coverage" },
];

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`${compact ? "h-8 w-8" : "h-9 w-9"} relative grid shrink-0 place-items-center rounded-xl border border-[#7657ff]/40 bg-[#7657ff]/10`}
      >
        <span className={`${compact ? "text-[13px]" : "text-[15px]"} font-bold tracking-tight text-[#8b72ff]`}>N</span>
        <span className="absolute inset-0 rounded-xl shadow-[0_8px_30px_-12px_rgba(118,87,255,0.8)]" />
      </div>
      <div className="leading-none">
        <div className="text-[13px] font-semibold tracking-[0.2em] text-[#f7f7f8]">NEXUS</div>
        <div className="mt-1 text-[10px] font-medium tracking-[0.32em] text-[#9999a2]">ALLIANCE</div>
      </div>
    </div>
  );
}

function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#09090b]">
      <div
        className="absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.18] blur-[140px]"
        style={{ background: ACCENT }}
      />
      <div className="nexus-grid absolute inset-0 opacity-[0.55]" />
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8b72ff]">{eyebrow}</div>
      <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-[#f7f7f8] sm:text-[32px]">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-relaxed text-[#9999a2]">{description}</p> : null}
    </div>
  );
}

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#7657ff] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#866cff] hover:shadow-[0_8px_30px_-12px_rgba(118,87,255,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7657ff]/60";
const ghostBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/[0.14] bg-[#18181d] px-4 py-2.5 text-sm font-medium text-[#f7f7f8] transition-all duration-200 hover:border-[#7657ff]/40 hover:bg-[#202026] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7657ff]/60";

export default function NexusLanding({ locale }: { locale: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const loginHref = `/${locale}/login`;
  const applyHref = `/${locale}/register`;

  return (
    <div className="relative min-h-screen bg-[#09090b] text-[#f7f7f8]">
      <AmbientBackdrop />
      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090b]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
            <Link href={`/${locale}`} className="transition-opacity hover:opacity-80"><Wordmark /></Link>
            <nav className="hidden items-center gap-7 lg:flex">
              {sectionLinks.map((link) => (
                <a key={link.href} href={link.href} className="text-[13px] font-medium text-[#9999a2] transition-colors hover:text-[#f7f7f8]">{link.label}</a>
              ))}
            </nav>
            <div className="hidden items-center gap-2 sm:flex">
              <Link href={loginHref} className={`${ghostBtn} px-3.5 py-2 text-[13px]`}>Affiliate login</Link>
              <Link href={applyHref} className={`${primaryBtn} px-3.5 py-2 text-[13px]`}>Apply to join</Link>
            </div>
            <button
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setMenuOpen((value) => !value)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-[#18181d] text-[#9999a2] sm:hidden"
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
          {menuOpen ? (
            <div className="border-t border-white/[0.08] bg-[#121216] px-5 py-4 sm:hidden">
              <div className="flex flex-col gap-1">
                {sectionLinks.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 text-sm text-[#9999a2] hover:bg-[#18181d] hover:text-[#f7f7f8]">{link.label}</a>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link href={loginHref} className={`${ghostBtn} py-2 text-[13px]`}>Login</Link>
                <Link href={applyHref} className={`${primaryBtn} py-2 text-[13px]`}>Apply</Link>
              </div>
            </div>
          ) : null}
        </header>

        <main>
          <section className="mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#18181d] px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[#9999a2]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7657ff]" />
                PRIVATE PERFORMANCE PARTNERSHIP NETWORK
              </div>
              <h1 className="mt-6 text-[38px] font-semibold leading-[1.05] tracking-[-0.045em] text-[#f7f7f8] sm:text-[60px]">
                Performance partnerships.<br /><span className="text-[#9999a2]">Built to scale.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-[#9999a2]">
                NEXUS ALLIANCE connects ambitious affiliates with high-performing offers, transparent tracking and dedicated account management.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href={applyHref} className={`${primaryBtn} w-full sm:w-auto`}>Apply to join <ArrowRight className="h-4 w-4" /></Link>
                <Link href={loginHref} className={`${ghostBtn} w-full sm:w-auto`}>Affiliate login</Link>
              </div>
              <p className="mt-5 text-xs text-[#777780]">Access is granted after review. Applications are assessed individually.</p>
            </div>
          </section>

          <section id="platform" className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading eyebrow="What NEXUS provides" title="An operating layer for serious affiliate businesses" description="Everything an approved partner needs to plan, run and settle performance campaigns — without chasing numbers." />
              <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {provisions.map((item) => (
                  <div key={item.title} className="group rounded-xl border border-white/[0.08] bg-[#121216] p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_16px_40px_-18px_rgba(0,0,0,0.75)]">
                    <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/[0.08] bg-[#18181d] text-[#9999a2] transition-colors group-hover:text-[#8b72ff]"><item.icon className="h-[18px] w-[18px]" /></div>
                    <h3 className="mt-4 text-sm font-semibold text-[#f7f7f8]">{item.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#9999a2]">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="verticals" className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading eyebrow="Verticals" title="Focused where we perform" description="We operate a deliberately narrow vertical footprint. The platform architecture supports additional verticals as the network expands." />
              <div className="mt-12 grid gap-4 md:grid-cols-2">
                {[
                  { name: "iGaming", body: "Casino and sportsbook partnerships across regulated and growth markets, with defined quality and validation requirements." },
                  { name: "Nutra", body: "Performance campaigns with clear lead qualification standards and consistent commercial handling." },
                ].map((vertical) => (
                  <div key={vertical.name} className="rounded-xl border border-white/[0.08] bg-[#121216] p-7 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#f7f7f8]">{vertical.name}</h3>
                      <span className="rounded-md border border-[#7657ff]/35 bg-[#7657ff]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b72ff]">Active</span>
                    </div>
                    <p className="mt-3 text-[13px] leading-relaxed text-[#9999a2]">{vertical.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-center text-xs text-[#777780]">Offer details and commercial terms are shared with approved partners only.</p>
            </div>
          </section>

          <section id="reach" className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8b72ff]">Global reach</div>
                  <h2 className="mt-3 text-[26px] font-semibold tracking-[-0.03em] text-[#f7f7f8] sm:text-[32px]">International coverage, managed locally</h2>
                  <p className="mt-4 text-sm leading-relaxed text-[#9999a2]">NEXUS operates across multiple continents with market-specific commercial terms. Coverage, caps and conditions differ by market and are discussed directly with your account manager once you are approved.</p>
                  <div className="mt-6 flex items-center gap-2 text-xs text-[#9999a2]"><Globe2 className="h-4 w-4" />Market availability is reviewed continuously.</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {regions.map((item) => (
                    <div key={item.region} className="rounded-xl border border-white/[0.08] bg-[#121216] px-5 py-4 transition-colors hover:border-white/[0.14]">
                      <div className="text-sm font-medium text-[#f7f7f8]">{item.region}</div>
                      <div className="mt-1 text-xs text-[#9999a2]">{item.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading eyebrow="How it works" title="From application to payout" description="A structured onboarding path with no ambiguity about what happens next." />
              <ol className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {steps.map((step, index) => (
                  <li key={step.title} className="relative rounded-xl border border-white/[0.08] bg-[#121216] p-5 transition-colors hover:border-white/[0.14]">
                    <div className="flex items-center justify-between">
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-[#18181d] text-[#9999a2]"><step.icon className="h-4 w-4" /></span>
                      <span className="text-[11px] font-semibold tabular-nums text-[#66666e]">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <div className="mt-4 text-sm font-semibold text-[#f7f7f8]">{step.title}</div>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#9999a2]">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
              <SectionHeading eyebrow="Why NEXUS" title="Built for partners who plan beyond this month" />
              <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {whyNexus.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-[#18181d] text-[#8b72ff]"><item.icon className="h-4 w-4" /></span>
                    <div><div className="text-sm font-semibold text-[#f7f7f8]">{item.title}</div><p className="mt-1.5 text-[13px] leading-relaxed text-[#9999a2]">{item.body}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-white/[0.08] py-20">
            <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
              <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#18181d] px-6 py-14 text-center shadow-[0_16px_40px_-18px_rgba(0,0,0,0.75)] sm:px-14">
                <span className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#7657ff] to-transparent opacity-70" />
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-[#f7f7f8] sm:text-[34px]">Ready to scale with NEXUS?</h2>
                <p className="mx-auto mt-3 max-w-lg text-sm text-[#9999a2]">Applications are reviewed individually by our partnerships team. Tell us about your traffic and we will come back to you.</p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href={applyHref} className={`${primaryBtn} w-full sm:w-auto`}>Apply to join <ArrowRight className="h-4 w-4" /></Link>
                  <Link href={loginHref} className={`${ghostBtn} w-full sm:w-auto`}>Affiliate login</Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[0.08] py-10">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:px-8 md:flex-row">
            <Wordmark compact />
            <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[13px] text-[#9999a2]">
              <a href="#platform" className="transition-colors hover:text-[#f7f7f8]">Privacy</a>
              <a href="#platform" className="transition-colors hover:text-[#f7f7f8]">Terms</a>
              <a href="mailto:partners@nexusalliance.io" className="transition-colors hover:text-[#f7f7f8]">Contact</a>
              <Link href={loginHref} className="transition-colors hover:text-[#f7f7f8]">Login</Link>
            </nav>
            <div className="text-[11px] text-[#777780]">© 2026 NEXUS ALLIANCE</div>
          </div>
        </footer>
      </div>
    </div>
  );
}
