"use client";

export default function Actions({ id, current }: { id: string; current: string }) {
  const approve = async () => {
    const r = await fetch(`/api/offers/requests/${id}/approve`, { method: "POST" });
    if (!r.ok) alert("Ошибка approve");
    else location.reload();
  };
  const reject = async () => {
    const r = await fetch(`/api/offers/requests/${id}/reject`, { method: "POST" });
    if (!r.ok) alert("Ошибка reject");
    else location.reload();
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
