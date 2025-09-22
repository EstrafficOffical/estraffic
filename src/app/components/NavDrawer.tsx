// src/app/components/NavDrawer.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Props = {
  open: boolean;
  onClose: () => void;
  locale?: string;
  // опционально — если хочешь пробрасывать извне
  isAdmin?: boolean;
  userEmail?: string;
  userBadge?: string;
};

type SessionPayload = {
  user?: {
    email?: string | null;
    name?: string | null;
    image?: string | null;
    // если в next-auth callbacks ты добавляешь роль/статус — они приедут сюда
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
    () => (locale ?? pathname?.split("/")?.[1] ?? "ru"),
    [locale, pathname]
  );

  // локальное состояние авторизации (достанем из /api/auth/session)
  const [email, setEmail] = useState<string | undefined>(userEmailProp);
  const [role, setRole] = useState<string | undefined>(undefined);
  const [statusFlag, setStatusFlag] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (userEmailProp) return; // уже пробросили с сервера
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/session");
        if (!r.ok) return;
        const data = (await r.json()) as SessionPayload;
        if (cancelled) return;
        setEmail(data?.user?.email ?? undefined);
        setRole((data?.user as any)?.role ?? undefined);
        setStatusFlag((data?.user as any)?.status ?? undefined);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userEmailProp]);

  const authed = !!email;
  const isAdmin = isAdminProp ?? role === "ADMIN";
  const badge =
    userBadgeProp ??
    ([role, statusFlag].filter(Boolean).join(" · ") || undefined);

  // утилита active-ссылки
  const A = (href: string, label: string) => {
    const active = pathname?.startsWith(`/${detectedLocale}${href === "/" ? "" : href}`);
    return (
      <Link
        href={`/${detectedLocale}${href}`}
        onClick={onClose}
        className={`block w-full rounded-xl px-4 py-2 text-[15px] leading-6 transition
          ${active ? "bg-white/10 text-white" : "text-white/90 hover:bg-white/10"}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* overlay */}
      <div
        aria-hidden
        className={`fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm transition-opacity
          ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* панель */}
      <aside
        role="dialog"
        aria-label="Навигация"
        className={`fixed left-0 top-0 z-[61] h-full w-[360px] max-w-[85vw]
          border-r border-white/10 bg-zinc-950/95 text-white
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* шапка */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-white/15">★</span>
            <span className="text-[15px] font-semibold text-white">Навигация</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/20 px-2 py-1 text-sm text-white/80 hover:bg-white/10"
            aria-label="Закрыть (Esc)"
            title="Закрыть (Esc)"
          >
            Esc
          </button>
        </div>

        <div className="h-[calc(100%-106px)] overflow-y-auto px-3 py-3">
          <nav className="space-y-1">
            {/* Всегда доступна "Главная" */}
            <div className="list-none space-y-1">
              {A("/", "Главная")}
            </div>

            {/* Остальные пункты — только если залогинен */}
            {authed && (
              <div className="mt-2 list-none space-y-1">
                {A("/profile", "Профиль")}
                {A("/stats", "Статистика")}
                {A("/offers", "Офферы")}
                {A("/offers/mine", "Мои офферы")}
                {A("/finance", "Финансы")}
                {A("/postback", "Постбеки")}
                {A("/conversions", "Конверсии")}
              </div>
            )}

            {/* Админ-раздел */}
            {authed && isAdmin && (
              <>
                <div className="mt-3 select-none px-2 text-xs uppercase tracking-wide text-white/40">
                  Администрирование
                </div>
                <div className="list-none space-y-1">
                  {A("/admin/offers/create", "Создать оффер")}
                  {A("/admin/requests", "Заявки на офферы")}
                  {A("/admin/users", "Пользователи")}
                </div>
              </>
            )}
          </nav>

          <div className="h-24" />
        </div>

        {/* футер */}
        <div className="sticky bottom-0 w-full border-t border-white/10 bg-zinc-950/95 px-4 py-3">
          {!authed ? (
            <Link
              href={`/api/auth/signin?callbackUrl=/${detectedLocale}`}
              onClick={onClose}
              className="block w-full truncate text-left text-[13px] text-white/90 hover:text-white"
            >
              Войти
            </Link>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-[13px] text-white/80" title={email}>
                {email}
                {badge ? (
                  <span className="pointer-events-none ml-2 rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-white/70">
                    {badge}
                  </span>
                ) : null}
              </div>
              <form method="POST" action="/api/auth/signout">
                <input type="hidden" name="callbackUrl" value={`/${detectedLocale}`} />
                <button
                  className="rounded-md border border-white/20 px-3 py-1 text-[13px] text-white/80 hover:bg-white/10"
                  onClick={onClose}
                >
                  Выйти
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
