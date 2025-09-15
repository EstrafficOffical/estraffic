"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

function cx(...cls: Array<string | false | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function AuthButton() {
  const { data, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Закрыть меню при клике вне
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Пока грузится сессия — ничего не дергаем
  if (status === "loading") {
    return (
      <div className="h-9 w-24 animate-pulse rounded-full bg-white/10" />
    );
  }

  // Не авторизован — компактная кнопка «Войти»
  if (!data?.user) {
    return (
      <button
        onClick={() => signIn()}
        className="h-9 rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white/90
                   backdrop-blur hover:bg-white/15 transition"
      >
        Войти
      </button>
    );
  }

  // Авторизован — чип с аватаром и меню
  const name = data.user.name ?? data.user.email ?? "User";
  const email = data.user.email ?? "";
  const initial = (name || email).trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "group flex h-9 items-center gap-2 rounded-full border border-white/15",
          "bg-white/8 px-3 text-sm text-white/90 backdrop-blur transition",
          "hover:bg-white/12"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[11px]
                     font-semibold text-white"
          aria-hidden
        >
          {initial}
        </span>
        <span className="max-w-[140px] truncate">{name}</span>
        <svg
          className={cx(
            "h-4 w-4 transition-transform duration-200",
            open && "rotate-180"
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10
                     bg-zinc-900/95 p-2 shadow-xl backdrop-blur"
        >
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm text-white">{name}</div>
              <div className="truncate text-xs text-white/60">{email}</div>
            </div>
          </div>

          <div className="my-2 h-px bg-white/10" />

          {/* здесь при желании можно добавить ссылку на профиль/настройки */}
          <button
            onClick={() => signOut()}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
            role="menuitem"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}
