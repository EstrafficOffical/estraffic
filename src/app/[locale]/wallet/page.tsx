"use client";

import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";

type Wallet = {
  id: string;
  userId: string;
  address: string;
  chain: "evm" | "tron" | "sol";
  verified: boolean;
  createdAt: string;
};

export default function WalletSettingsPage() {
  const t = useTranslations("wallet");
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState<"evm" | "tron" | "sol">("evm");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/wallet");
        const data = await res.json();
        if (data.ok && data.wallet) {
          const w: Wallet = data.wallet;
          setAddress(w.address || "");
          setChain((w.chain as any) || "evm");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [locale]);

  const onSave = async () => {
    setMessage(null);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain })
      });
      const data = await res.json();
      if (data.ok) setMessage(t("saved"));
      else setMessage(`${t("error")}: ${data.error || "unknown"}`);
    } catch (e: any) {
      setMessage(`${t("error")}: ${String(e?.message ?? e)}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {loading ? (
        <p>...</p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-sm text-gray-600">{t("network")}</span>
            <select
              className="border rounded p-2 w-full"
              value={chain}
              onChange={(e) => setChain(e.target.value as any)}
            >
              <option value="evm">EVM (USDT TRC20/ERC20, BSC…)</option>
              <option value="tron">TRON</option>
              <option value="sol">Solana</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-gray-600">{t("address")}</span>
            <input
              className="border rounded p-2 w-full"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("placeholder")}
            />
          </label>

          <button
            onClick={onSave}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={!address}
          >
            {t("save")}
          </button>

          {message && <p className="text-sm">{message}</p>}
        </>
      )}
    </div>
  );
}
