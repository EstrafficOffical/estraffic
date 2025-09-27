"use client";

import { useRef, useState } from "react";

export default function AvatarUploader({
  initialUrl,
  onSaved,
}: {
  initialUrl?: string | null;
  onSaved?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl || null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickFile() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Выберите изображение");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Размер до 5 МБ");
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function save() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      // 1) пресайн
      const res1 = await fetch("/api/upload/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!res1.ok) throw new Error("Не удалось получить ссылку загрузки");
      const { uploadUrl, publicUrl } = await res1.json();

      // 2) upload PUT
      const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("Ошибка загрузки");

      // 3) PATCH профиль
      const res2 = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: publicUrl }),
      });
      if (!res2.ok) throw new Error("Не удалось сохранить профиль");

      setFile(null);
      onSaved?.(publicUrl);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative h-32 w-32 overflow-hidden rounded-full border border-white/20 bg-white/5 shadow-[0_8px_40px_rgba(0,0,0,.45)]"
        onClick={pickFile}
        role="button"
        title="Загрузить аватар"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">Нет аватара</div>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>

      <div className="flex gap-2">
        <button
          onClick={pickFile}
          className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/15"
          type="button"
        >
          Выбрать
        </button>
        <button
          onClick={save}
          disabled={!file || loading}
          className="rounded-xl border border-rose-500/40 bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
          type="button"
        >
          {loading ? "Загрузка…" : "Сохранить"}
        </button>
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}
      <div className="text-xs text-white/50">PNG/JPG до 5 МБ</div>
    </div>
  );
}
