"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { current?: string };

export default function AvatarUploader({ current }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(current);
  const router = useRouter();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    // локальный preview
    const url = URL.createObjectURL(f);
    setPreview(url);

    const fd = new FormData();
    fd.append("file", f);

    setLoading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "upload_error");
      router.refresh(); // перерисовать серверные компоненты
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить аватар");
      setPreview(current); // откат
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* сам аватар */}
      <img
        src={preview || "/avatar-placeholder.png"}
        alt="Avatar"
        className="h-32 w-32 rounded-full object-cover border border-white/10 bg-white/5"
      />

      {/* кнопка-камера */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur hover:bg-white/20 transition disabled:opacity-50"
        disabled={loading}
        aria-label="Change avatar"
        title="Change avatar"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-white/90"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5 7h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
        </svg>
      </button>

      {/* скрытый input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
