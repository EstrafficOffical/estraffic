"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  locale?: string;
  isAdmin?: boolean;
  userEmail?: string;
  userBadge?: string;
};

type SessionPayload = {
  user?: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string | null;
    status?: string | null;
  } | null;
};

export default function NavDrawer({
  open,
  onClose,
  locale,
  isAdmin: isAdminProp,
  userEmail: userEmailProp,
  userBadge: userBadgeProp,
}: Props) {
  const pathname = usePathname();

  const detectedLocale = useMemo(
    () => locale ?? pathname?.split("/")?.[1] ?? "ru",
    [locale, pathname],
  );

  const [email, setEmail] = useState<string | undefined>(userEmailProp);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [statusFlag, setStatusFlag] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (userEmailProp) return;

    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as SessionPayload;
        if (cancelled) return;

        setEmail(data?.user?.email ?? undefined);
        setRole(data?.user?.role ?? undefined);
        setStatusFlag(data?.user?.status ?? undefined);
      } catch {
        // Session loading failure should not break navigation rendering.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userEmailProp]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const authed = Boolean(email);
  const isAdmin =
    isAdminProp ?? ["OWNER", "ADMIN"].includes(String(role || ""));
  const badge =
    userBadgeProp ??
    ([role, statusFlag].filter(Boolean).join(" · ") || undefined);

  const hrefFor = (href: string) =>
    `/${detectedLocale}${href === "/" ? "" : href}`;

  const navItem = (href: string, label: string) => {
    const target = hrefFor(href);
    const active =
      pathname === target ||
      (href !== "/" && pathname?.startsWith(`${target}/`));

    return (
      <Link
        href={target}
        onClick={onClose}
        className={`flex min-h-10 items-center rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
          active
            ? "bg-white/[0.075] text-white"
            : "text-white/58 hover:bg-white/[0.045] hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <div
        aria-hidden
        className={`fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm transition-opacity ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="NEXUS navigation"
        className={`fixed left-0 top-0 z-[81] flex h-dvh w-[350px] max-w-[88vw] flex-col border-r border-white/[0.08] bg-[#090a0e]/98 text-white shadow-[30px_0_90px_rgba(0,0,0,.42)] backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex h-[78px] items-center justify-between border-b border-white/[0.07] px-5">
          <Link
            href={`/${detectedLocale}`}
            onClick={onClose}
            className="flex items-center gap-3"
          >
            <span className="grid size-10 place-items-center rounded-xl border border-[#7657ff]/45 bg-[#7657ff]/10 text-sm font-bold text-[#9a87ff]">
              N
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.20em]">
                NEXUS
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold tracking-[0.32em] text-white/34">
                ALLIANCE
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            title="Close navigation"
            className="grid size-9 place-items-center rounded-xl border border-white/[0.09] bg-white/[0.025] text-sm text-white/45 transition hover:bg-white/[0.055] hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="px-2 text-[9px] font-semibold uppercase tracking-[0.20em] text-white/24">
            Affiliate
          </div>

          <nav className="mt-2 space-y-1">
            {navItem("/", "Dashboard")}
            {authed ? (
              <>
                {navItem("/offers", "Offers")}
                {navItem("/offers/mine", "My Offers")}
                {navItem("/stats", "Statistics")}
                {navItem("/finance", "Finance")}
                {navItem("/profile", "Profile")}
              </>
            ) : null}
          </nav>

          {authed && isAdmin ? (
            <>
              <div className="mx-2 my-5 h-px bg-white/[0.07]" />

              <div className="px-2 text-[9px] font-semibold uppercase tracking-[0.20em] text-[#8068ff]">
                Administration
              </div>

              <nav className="mt-2 space-y-1">
                {navItem("/admin/stats", "Control Center")}
                {navItem("/admin/analytics", "Network Analytics")}
                {navItem("/admin/offers", "Offers")}
                {navItem("/admin/requests", "Access Requests")}
                {navItem("/admin/registrations", "Registrations")}
                {navItem("/admin/users", "Users")}
                {navItem("/admin/team", "Team & Roles")}
                {navItem("/conversions", "Conversions")}
                {navItem("/admin/payouts", "Payouts")}
                {navItem("/postbacks", "Integrations")}
              </nav>
            </>
          ) : null}
        </div>

        <footer className="border-t border-white/[0.07] bg-black/10 p-4">
          {!authed ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/${detectedLocale}/login`}
                onClick={onClose}
                className="flex h-10 items-center justify-center rounded-xl border border-white/[0.10] bg-white/[0.025] text-xs font-semibold text-white/62 transition hover:bg-white/[0.05] hover:text-white"
              >
                Sign in
              </Link>

              <Link
                href={`/${detectedLocale}/register`}
                onClick={onClose}
                className="flex h-10 items-center justify-center rounded-xl bg-[#7657ff] text-xs font-semibold text-white transition hover:bg-[#846cff]"
              >
                Apply to join
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
              <div className="min-w-0">
                <div
                  className="truncate text-xs font-medium text-white/72"
                  title={email}
                >
                  {email}
                </div>

                {badge ? (
                  <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-[#8f7aff]">
                    {badge}
                  </div>
                ) : null}
              </div>

              <form
                method="POST"
                action="/api/auth/signout"
                className="mt-3 border-t border-white/[0.06] pt-3"
              >
                <input
                  type="hidden"
                  name="callbackUrl"
                  value={`/${detectedLocale}`}
                />
                <button
                  type="submit"
                  onClick={onClose}
                  className="text-[11px] font-medium text-white/38 transition hover:text-white/70"
                >
                  Sign out
                </button>
              </form>
            </div>
          )}
        </footer>
      </aside>
    </>
  );
}