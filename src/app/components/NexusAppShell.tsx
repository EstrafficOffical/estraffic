"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

type Role = "USER" | "MANAGER" | "ADMIN" | "OWNER";

type Props = {
  children: React.ReactNode;
  locale: string;
  user: {
    name?: string | null;
    email?: string | null;
    role: Role;
    tier?: number | null;
  };
};

type NavItem = { href: string; label: string; icon: React.ReactNode };

const iconClass = "h-[17px] w-[17px]";

const icons = {
  dashboard: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  offers: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>,
  myOffers: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l3 3v15H6z"/><path d="M9 11h6M9 15h6"/></svg>,
  stats: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>,
  finance: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></svg>,
  profile: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-4 3.2-6 7-6s6.2 2 7 6"/></svg>,
  control: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 4h16v6H4zM4 14h7v6H4zM15 14h5v6h-5z"/></svg>,
  requests: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h10v18H7z"/><path d="M9.5 8h5M9.5 12h5M9.5 16h3"/></svg>,
  users: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.6-4 2.4-6 5.5-6s4.9 2 5.5 6M16 7.5a2.5 2.5 0 1 1 0 5M17 15c2.2.5 3.4 2.2 3.8 5"/></svg>,
  conversions: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 7h11M13 4l3 3-3 3M19 17H8M11 14l-3 3 3 3"/></svg>,
  integrations: <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 12h8M7 7l-4 5 4 5M17 7l4 5-4 5"/></svg>,
};

export default function NexusAppShell({ children, locale, user }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isStaff = ["MANAGER", "ADMIN", "OWNER"].includes(user.role);
  const isAdmin = ["ADMIN", "OWNER"].includes(user.role);

  const affiliateNav = useMemo<NavItem[]>(() => [
    { href: `/${locale}`, label: "Dashboard", icon: icons.dashboard },
    { href: `/${locale}/offers`, label: "Offers", icon: icons.offers },
    { href: `/${locale}/offers/mine`, label: "My Offers", icon: icons.myOffers },
    { href: `/${locale}/stats`, label: "Statistics", icon: icons.stats },
    { href: `/${locale}/finance`, label: "Finance", icon: icons.finance },
    { href: `/${locale}/profile`, label: "Profile", icon: icons.profile },
  ], [locale]);

  const adminNav = useMemo<NavItem[]>(() => [
    { href: `/${locale}/admin/stats`, label: "Control Center", icon: icons.control },
    { href: `/${locale}/admin/analytics`, label: "Network Analytics", icon: icons.stats },
    { href: `/${locale}/admin/offers`, label: "Offers", icon: icons.offers },
    { href: `/${locale}/admin/requests`, label: "Access Requests", icon: icons.requests },
    { href: `/${locale}/admin/registrations`, label: "Registrations", icon: icons.requests },
    { href: `/${locale}/admin/users`, label: "Users", icon: icons.users },
    { href: `/${locale}/admin/team`, label: "Team & Roles", icon: icons.users },
    { href: `/${locale}/conversions`, label: "Conversions", icon: icons.conversions },
    { href: `/${locale}/admin/payouts`, label: "Payouts", icon: icons.conversions },
    { href: `/${locale}/postbacks`, label: "Integrations", icon: icons.integrations },
  ], [locale]);

  const initials = (user.name || user.email || "NA")
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const isActive = (href: string) => href === `/${locale}` ? pathname === href : pathname?.startsWith(href);

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0b0b0e] text-white">
      <div className="flex h-16 items-center border-b border-white/[0.07] px-5">
        <Link href={`/${locale}`} className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <span className="grid h-8 w-8 place-items-center rounded-[10px] border border-[#7657ff]/45 bg-[#7657ff]/10 text-[13px] font-bold text-[#8b73ff] shadow-[0_0_24px_rgba(118,87,255,.12)]">N</span>
          <span className="leading-none">
            <span className="block text-[13px] font-semibold tracking-[0.18em]">NEXUS</span>
            <span className="mt-1 block text-[10px] font-medium tracking-[0.3em] text-white/40">ALLIANCE</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <NavSection title="Affiliate" items={affiliateNav} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
        {isStaff && (
          <div className="mt-5 border-t border-white/[0.07] pt-5">
            <NavSection title="Administration" items={isAdmin ? adminNav : adminNav.filter((i) => ["Access Requests", "Registrations", "Users", "Team & Roles"].includes(i.label))} isActive={isActive} onNavigate={() => setMobileOpen(false)} accent />
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.07] p-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-xs font-semibold text-white/80">{initials || "NA"}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{user.name || "NEXUS member"}</div>
              <div className="truncate text-[11px] text-white/40">{user.email}</div>
            </div>
            <span className="rounded-md border border-[#7657ff]/30 bg-[#7657ff]/10 px-2 py-1 text-[9px] font-semibold tracking-[0.08em] text-[#927cff]">{user.role}</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-[11px] text-white/40">{user.role === "USER" ? `Tier ${user.tier ?? 3}` : "Staff account"}</span>
            <form method="POST" action="/api/auth/signout">
              <input type="hidden" name="callbackUrl" value={`/${locale}`} />
              <button className="text-[11px] font-medium text-white/55 transition hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#08080b] text-[#f4f2f8]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-white/[0.07] lg:block">{sidebar}</aside>

      {mobileOpen && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-[60] w-[286px] border-r border-white/[0.08] transition-transform lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>{sidebar}</aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.07] bg-[#08080b]/90 px-4 backdrop-blur-xl md:px-7">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.09] bg-white/[0.025] text-white/65 lg:hidden" aria-label="Open navigation">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            </button>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">NEXUS ALLIANCE</div>
              <div className="mt-0.5 text-[13px] text-white/65">Performance workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-[11px] text-white/50 sm:inline">{user.role === "USER" ? `Tier ${user.tier ?? 3}` : user.role}</span>
            <Link href={`/${locale}/profile`} className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-xs font-semibold text-white/70">{initials || "NA"}</Link>
          </div>
        </header>
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}

function NavSection({ title, items, isActive, onNavigate, accent = false }: { title: string; items: NavItem[]; isActive: (href: string) => boolean; onNavigate: () => void; accent?: boolean }) {
  return (
    <div>
      <div className={`mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? "text-[#8068ff]" : "text-white/30"}`}>{title}</div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate} className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition ${active ? "bg-white/[0.06] text-white before:absolute before:inset-y-1.5 before:-left-3 before:w-[2px] before:rounded-full before:bg-[#7657ff]" : "text-white/48 hover:bg-white/[0.035] hover:text-white/82"}`}>
              <span className="opacity-80">{item.icon}</span><span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
