// src/app/[locale]/(auth)/admin/requests/HeaderClient.tsx
"use client";

import { useState } from "react";
import NavDrawer from "@/app/components/NavDrawer";

export default function HeaderClient({ title = "Заявки на офферы" }: { title?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="rounded-xl border border-white/25 px-3 py-1.5 text-sm hover:bg-white/10"
          title="Открыть меню"
        >
          Меню
        </button>
      </div>

      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
