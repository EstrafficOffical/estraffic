"use client";

import { useState } from "react";
import Link from "next/link";
import NavToggle from "@/app/components/NavToggle";
import NavDrawer from "@/app/components/NavDrawer";

export default function AuthedHomeHeader({
  locale,
  displayName,
}: {
  locale: string;
  displayName: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavToggle onClick={() => setMenuOpen(true)} />
          <div>
            <div className="text-sm text-white/60">Главная</div>
            <div className="text-lg font-semibold">{displayName}</div>
          </div>
        </div>

        <div className="hidden gap-2 sm:flex">
          <Link
            href={`/${locale}/offers`}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Офферы
          </Link>
          <Link
            href={`/${locale}/profile`}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Профиль
          </Link>
          <a
            href={`/api/auth/signout?callbackUrl=/${locale}`}
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Выйти
          </a>
        </div>
      </header>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} locale={locale} />
    </>
  );
}
