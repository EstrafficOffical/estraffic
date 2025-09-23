"use client";

export default function RowActions({
  id,
  meId,
  role,
  status,
}: {
  id: string;
  meId: string;
  role: "USER" | "ADMIN";
  status: "PENDING" | "APPROVED" | "BANNED";
}) {
  const doPost = async (path: string) => {
    const r = await fetch(path, { method: "POST" });
    if (!r.ok) {
      alert("Ошибка");
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
        disabled={status === "BANNED" || id === meId /* не баним себя */}
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
        disabled={role === "USER" || disabledSelfDanger /* не снимаем себе админа, если один */}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-white/80 hover:bg-white/10 disabled:opacity-40"
      >
        Make User
      </button>
    </div>
  );
}
