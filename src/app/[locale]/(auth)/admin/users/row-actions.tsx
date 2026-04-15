"use client";

export default function RowActions({
  id,
  meId,
  role,
  status,
  tier,
}: {
  id: string;
  meId: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "BANNED";
  tier: number;
}) {
  const doPost = async (path: string, body?: any) => {
    const r = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || j?.ok === false) {
      alert(j?.error || "Ошибка");
    } else {
      location.reload();
    }
  };

  const disabledSelfDanger =
    id === meId && (role === "ADMIN" || status === "APPROVED");

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => doPost(`/api/admin/users/${id}/approve`)}
        disabled={status === "APPROVED"}
        className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-40"
      >
        Approve
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/ban`)}
        disabled={status === "BANNED" || id === meId}
        className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
      >
        Ban
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/make-admin`)}
        disabled={role === "ADMIN"}
        className="rounded-lg border border-blue-400/30 px-3 py-1.5 text-blue-300 hover:bg-blue-400/10 disabled:opacity-40"
      >
        Make Admin
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/make-user`)}
        disabled={role === "USER" || disabledSelfDanger}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 hover:bg-white/10 disabled:opacity-40"
      >
        Make User
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/tier`, { tier: 1 })}
        disabled={tier === 1}
        className="rounded-lg border border-yellow-400/30 px-3 py-1.5 text-yellow-200 hover:bg-yellow-400/10 disabled:opacity-40"
      >
        T1
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/tier`, { tier: 2 })}
        disabled={tier === 2}
        className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-cyan-200 hover:bg-cyan-400/10 disabled:opacity-40"
      >
        T2
      </button>

      <button
        onClick={() => doPost(`/api/admin/users/${id}/tier`, { tier: 3 })}
        disabled={tier === 3}
        className="rounded-lg border border-amber-400/30 px-3 py-1.5 text-amber-200 hover:bg-amber-400/10 disabled:opacity-40"
      >
        T3
      </button>
    </div>
  );
}