"use client";

import { usePathname, useRouter } from "next/navigation";

const locales = ["ru", "uk", "en"] as const;

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || "/ru";

  function go(l: string) {
    const parts = pathname.split("/");
    parts[1] = l; // заменяем сегмент языка
    router.push(parts.join("/"));
  }

  return (
    <div className="flex gap-2">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => go(l)}
          className="px-2 py-1 border rounded hover:bg-gray-100"
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
