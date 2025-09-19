"use client";

import { useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "@/app/components/AuthButton";
import { useSession } from "next-auth/react";

type NavItem = { label: string; href: string; subtle?: boolean };

export default function NavDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const status = (session?.user as any)?.status as string | undefined;
  const isAdmin = role === "ADMIN";
  const isApproved = status === "APPROVED";

  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const pathname = usePathname();
  const locale = (pathname?.split("/")?.[1] || "ru") as string;
  const base = `/${locale}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      setTimeout(() => firstLinkRef.current?.focus(), 0);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const items = useMemo<NavItem[]>(() => {
    const list: NavItem[] = [
      { label: "Главная", href: `${base}` },
      { label: "Профиль", href: `${base}/profile` },
    ];

    // Приватные разделы — только после одобрения
    if (isApproved || isAdmin) {
      list.push(
        { label: "Офферы", href: `${base}/offers` },
        { label: "Мои офферы", href: `${base}/offers/mine` },
        { label: "Финансы", href: `${base}/finance` },
        { label: "Постбеки", href: `${base}/postbacks` },
        { label: "Конверсии", href: `${base}/conversions` },
      );
    }

    // Админка
    if (isAdmin) {
      list.push({ label: "Заявки на офферы", href: `${base}/admin/requests`, subtle: true });
      list.push({ label: "Новый оффер", href: `${base}/admin/offers/new`, subtle: true });
    }

    return list;
  }, [base, isApproved, isAdmin]);

  return (
    <div aria-hidden={!open} className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} role="dialog" aria-modal="true">
      <div onClick={onClose} className={`absolute inset-0 transition-opacity duration-200 ${open ? "bg-black/50 opacity-100" : "opacity-0"}`} />
      <aside
        className={`absolute left-0 top-0 h-full w-80 max-w-[90vw]
                    bg-zinc-950/90 backdrop-blur-xl border-r border-white/10
                    transition-transform duration-300 ease-out
                    ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
                <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
              </svg>
            </span>
            <span className="font-semibold">Навигация</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/20 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
            aria-label="Закрыть меню"
          >
            Esc
          </button>
        </div>

        <div className="px-2 py-2 space-y-1 overflow-y-auto h-[calc(100%-140px)]">
          {items.map((it, idx) => (
            <Link
              key={it.href}
              href={it.href}
              ref={idx === 0 ? firstLinkRef : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 outline-none
                          hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/20
                          ${it.subtle ? "text-white/60 hover:text-white/90" : "text-white/90"}`}
              onClick={onClose}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
              <span>{it.label}</span>
            </Link>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">© {new Date().getFullYear()} Estrella • v0.1</span>
          <AuthButton />
        </div>
      </aside>
    </div>
  );
}
