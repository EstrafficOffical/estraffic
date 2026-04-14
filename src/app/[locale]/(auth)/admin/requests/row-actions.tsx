"use client";

export default function Actions({ id, current }: { id: string; current: string }) {
  async function call(path: string) {
    const r = await fetch(path, { method: "POST" });
    const j = await r.json().catch(() => ({}));

    if (!r.ok || j?.ok === false) {
      throw new Error(j?.error || "Ошибка");
    }
  }

  const approve = async () => {
    try {
      await call(`/api/admin/requests/${id}/approve`);
      location.reload();
    } catch (e: any) {
      alert(e?.message || "Ошибка approve");
    }
  };

  const reject = async () => {
    try {
      await call(`/api/admin/requests/${id}/reject`);
      location.reload();
    } catch (e: any) {
      alert(e?.message || "Ошибка reject");
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={approve}
        disabled={current === "APPROVED"}
        className="rounded-lg border border-emerald-400/30 px-3 py-1.5 text-emerald-300 hover:bg-emerald-400/10 disabled:opacity-40"
      >
        Approve
      </button>

      <button
        onClick={reject}
        disabled={current === "REJECTED"}
        className="rounded-lg border border-rose-400/30 px-3 py-1.5 text-rose-300 hover:bg-rose-400/10 disabled:opacity-40"
      >
        Reject
      </button>
    </div>
  );
}