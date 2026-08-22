"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StaffAccessActions({ userId }: { userId: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  async function promote(role: "MANAGER" | "ADMIN") { if (!confirm(`Grant ${role} staff access to this account?`)) return; setBusy(true); try { const r = await fetch(`/api/admin/team/${userId}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "set-role", role }) }); const j = await r.json().catch(() => ({})); if (r.status === 428 && j?.error === "STEP_UP_REQUIRED") { const locale = window.location.pathname.split("/")[1] || "ru"; window.location.assign(`/${locale}/security/step-up?callbackUrl=${encodeURIComponent(window.location.pathname)}`); return; } if (!r.ok) throw new Error(j?.message || j?.error || "Request failed"); router.refresh(); } catch (e:any) { alert(e.message); } finally { setBusy(false); } }
  return <select disabled={busy} defaultValue="" onChange={(e) => { const v=e.target.value as "MANAGER"|"ADMIN"; if(v) promote(v); e.currentTarget.value=""; }} className="rounded-lg border border-white/[0.08] bg-[#111115] px-2 py-1.5 text-xs text-white/65"><option value="">Promote to staff…</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option></select>;
}
