"use client";

import { useState } from "react";
import NavDrawer from "@/app/components/NavDrawer";

export default function HeaderClient({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      {/* тот же Drawer, что и на Statistics */}
      <NavDrawer open={open} onClose={() => setOpen(false)} locale={locale} />
    </>
  );
}
