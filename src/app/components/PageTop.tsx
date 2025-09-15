"use client";

import { useState } from "react";
import AuthButton from "@/app/components/AuthButton"; // 👈 без фигурных скобок
// NavDrawer здесь не используется — убираем импорт, чтобы не ловить лишние ошибки
// import NavDrawer from "@/app/components/NavDrawer";

export default function PageTop() {
  const [menuOpen] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-black/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </span>
        <span className="font-semibold text-white">Estrella</span>
      </div>

      {/* Кнопка входа/выхода */}
      <AuthButton />
    </div>
  );
}
