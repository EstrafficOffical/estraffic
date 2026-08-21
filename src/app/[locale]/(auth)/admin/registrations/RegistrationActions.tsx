"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistrationActions({
  applicationId,
  managers,
}: {
  applicationId: string;
  managers: Array<{ id: string; name: string | null; email: string }>;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(3);
  const [managerId, setManagerId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function post(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || "Action failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-xl border border-white/[0.09] bg-[#111115] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9999a2]">Approval settings</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <div className="mb-1.5 text-xs text-[#888891]">Starting tier</div>
          <select value={tier} onChange={(e) => setTier(Number(e.target.value))} className="w-full rounded-lg border border-white/[0.10] bg-[#0d0d10] px-3 py-2 text-sm">
            <option value={1}>Tier 1</option>
            <option value={2}>Tier 2</option>
            <option value={3}>Tier 3</option>
          </select>
        </label>
        <label>
          <div className="mb-1.5 text-xs text-[#888891]">Assigned manager</div>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="w-full rounded-lg border border-white/[0.10] bg-[#0d0d10] px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.name || manager.email}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <div className="mb-1.5 text-xs text-[#888891]">Rejection reason (optional)</div>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-20 w-full resize-y rounded-lg border border-white/[0.10] bg-[#0d0d10] px-3 py-2 text-sm" placeholder="Why this application is not accepted…" />
      </label>
      {error ? <div className="mt-3 text-xs text-rose-400">{error}</div> : null}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("Reject this affiliate application?")) {
              void post(`/api/admin/registrations/${applicationId}/reject`, { reason });
            }
          }}
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 disabled:opacity-50"
        >
          Reject
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void post(`/api/admin/registrations/${applicationId}/approve`, { tier, managerId: managerId || null })}
          className="rounded-lg bg-[#7657ff] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#866cff] disabled:opacity-50"
        >
          {busy ? "Processing…" : "Approve affiliate"}
        </button>
      </div>
    </div>
  );
}
