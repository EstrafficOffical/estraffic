"use client";

import { useState } from "react";

type Wallet = {
  id: string;
  label: string | null;
  address: string;
  isPrimary: boolean;
  verified: boolean;
};

export default function WalletsCell({ wallets }: { wallets: Wallet[] }) {
  // локальный state, чтобы показывать «Copied»
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copy(addr: string, id: string) {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedId(id);
      setTimeout(() => setCopiedId((s) => (s === id ? null : s)), 1500);
    } catch {
      // no-op
    }
  }

  if (!wallets || wallets.length === 0) {
    return <span className="text-white/50 text-sm">—</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {wallets.map((w) => (
        <div key={w.id} className="text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{w.label ?? "Wallet"}</span>
            {w.isPrimary && (
              <span className="rounded border border-white/25 px-1">primary</span>
            )}
            {w.verified && (
              <span className="rounded border border-white/25 px-1">verified</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-white/70 break-all">{w.address}</span>
            <button
              onClick={() => copy(w.address, w.id)}
              className="shrink-0 rounded border border-white/20 bg-white/10 px-2 py-0.5 hover:bg-white/15"
              title="Copy address"
            >
              {copiedId === w.id ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
