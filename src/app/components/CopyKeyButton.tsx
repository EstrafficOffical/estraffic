"use client";

import { useState } from "react";

export default function CopyKeyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        } catch {}
      }}
      className="text-xs rounded-lg border border-zinc-700 px-2 py-1 hover:bg-zinc-800"
      title="Скопировать"
    >
      {ok ? "Скопировано" : "Копировать"}
    </button>
  );
}
