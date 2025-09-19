"use client";

import { useState } from "react";
import NavDrawer from "@/app/components/NavDrawer";

export default function NavToggle() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-white/20 px-3 py-2 hover:bg-white/10"
      >
        ☰ Меню
      </button>
      <NavDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
