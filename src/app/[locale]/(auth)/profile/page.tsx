'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import NavDrawer from '@/app/components/NavDrawer';

type BasicUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  telegram?: string | null;
  image?: string | null;
};

type GetProfileResponse = { user?: BasicUser };

export default function ProfilePage() {
  // ===== UI / drawer =====
  const [menuOpen, setMenuOpen] = useState(false);

  // ===== server data =====
  const [loading, setLoading] = useState(true);
  const [basic, setBasic] = useState<BasicUser | null>(null);

  // basic editable fields
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const email = useMemo(() => basic?.email ?? '', [basic]);

  // timezone (локальное хранение)
  const [tz, setTz] = useState<string>('UTC+03:00');

  // avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // password (опционально)
  const [currentPassword, setCurPwd] = useState('');
  const [newPassword, setNewPwd] = useState('');
  const [repeatPassword, setRepPwd] = useState('');

  // global save
  const [pending, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ===== initial load =====
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/profile', { cache: 'no-store' });
        const j: GetProfileResponse = await r.json().catch(() => ({} as any));
        if (!alive) return;
        if (r.ok && j.user) {
          setBasic(j.user);
          setName(j.user.name ?? '');
          setTelegram(j.user.telegram ?? '');
          setAvatarPreview(j.user.image ?? null);
        }
      } finally {
        if (alive) {
          // timezone: берём из localStorage либо по умолчанию
          const stored = typeof window !== 'undefined' ? localStorage.getItem('tz') : null;
          setTz(stored || 'UTC+03:00');
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  // ===== helpers =====
  function pickAvatar() {
    fileInputRef.current?.click();
  }
  function onAvatarChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function saveBasic(): Promise<string | null> {
    const r = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, telegram }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return j?.error || 'Не удалось сохранить профиль';
    }
    return null;
  }

  async function saveAvatar(): Promise<string | null> {
    if (!avatarFile) return null;
    const fd = new FormData();
    fd.append('file', avatarFile);
    const r = await fetch('/api/profile/avatar', { method: 'POST', body: fd });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return j?.error || 'Не удалось загрузить аватар';
    }
    const j = await r.json().catch(() => ({}));
    if (j?.url) setAvatarPreview(j.url);
    // сброс выбранного файла
    setAvatarFile(null);
    return null;
  }

  async function savePassword(): Promise<string | null> {
    // если не заполняли — пропускаем
    if (!currentPassword && !newPassword && !repeatPassword) return null;
    if (newPassword !== repeatPassword) return 'Пароли не совпадают';
    if (newPassword.length < 6) return 'Новый пароль слишком короткий';

    const r = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return j?.error || 'Не удалось изменить пароль';
    }
    // очистим поля
    setCurPwd('');
    setNewPwd('');
    setRepPwd('');
    return null;
  }

  function saveTimezone() {
    try {
      localStorage.setItem('tz', tz);
      return null as string | null;
    } catch {
      return 'Не удалось сохранить таймзону (localStorage)';
    }
  }

  function onSaveAll() {
    startSave(async () => {
      setSaveMsg(null);
      const errors: string[] = [];
      const done: string[] = [];

      // 1) basic
      {
        const e = await saveBasic();
        if (e) errors.push(`Профиль: ${e}`); else done.push('Профиль');
      }
      // 2) avatar
      {
        const e = await saveAvatar();
        if (e) errors.push(`Аватар: ${e}`); else if (avatarFile === null) done.push('Аватар (без изменений)'); else done.push('Аватар');
      }
      // 3) password
      {
        const e = await savePassword();
        if (e) errors.push(`Пароль: ${e}`); else if (currentPassword || newPassword || repeatPassword) done.push('Пароль');
      }
      // 4) timezone (локально)
      {
        const e = saveTimezone();
        if (e) errors.push(`Таймзона: ${e}`); else done.push('Таймзона');
      }

      setSaveMsg(
        errors.length
          ? `Готово: ${done.join(', ')}. Ошибки: ${errors.join('; ')}`
          : 'Все изменения сохранены',
      );
    });
  }

  return (
    <section className="relative max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Верхняя панель — звезда+бренд */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Открыть меню"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 border border-white/40"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white/80" aria-hidden>
            <path fill="currentColor" d="M12 2l2.6 6.9H22l-5.4 3.9 2.1 6.8L12 16.7 5.3 19.6 7.4 12.8 2 8.9h7.4L12 2z" />
          </svg>
        </button>
        <span className="font-semibold text-white">Estrella</span>

        <div className="ml-auto">
          <button
            onClick={onSaveAll}
            disabled={pending || loading}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            {pending ? 'Сохраняю…' : 'Сохранить всё'}
          </button>
        </div>
      </div>

      {/* Аватар */}
      <div className="relative flex justify-center">
        <div className="relative h-28 w-28 rounded-full border border-white/30 bg-white/10 overflow-hidden">
          {avatarPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-white/70">
              <svg viewBox="0 0 24 24" className="w-10 h-10" aria-hidden>
                <path
                  fill="currentColor"
                  d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.2 0-8 2.1-8 5v1h16v-1c0-2.9-3.8-5-8-5z"
                />
              </svg>
            </div>
          )}
          <button
            type="button"
            onClick={pickAvatar}
            className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-white text-zinc-900 border border-white/60 grid place-items-center shadow"
            title="Загрузить фото"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
              <path
                fill="currentColor"
                d="M5 7h3l2-2h4l2 2h3a1 1 0 011 1v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1zm7 3a3 3 0 100 6 3 3 0 000-6z"
              />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onAvatarChosen}
          />
        </div>
      </div>

      {/* Карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic */}
        <Card title="Basic">
          {loading ? (
            <div className="text-white/60 text-sm">Загрузка…</div>
          ) : (
            <div className="space-y-3">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
                />
              </Field>
              <Field label="Telegram (без @)">
                <input
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  maxLength={64}
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
                />
              </Field>
              <Field label="Email">
                <input
                  value={email}
                  readOnly
                  className="w-full rounded-xl border border-white/20 bg-white/10 text-white/70 px-3 py-2 text-sm outline-none"
                />
              </Field>
            </div>
          )}
        </Card>

        {/* Preferences */}
        <Card title="Preferences">
          <div className="space-y-3">
            <Field label="Timezone">
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              >
                {['UTC+00:00','UTC+01:00','UTC+02:00','UTC+03:00','UTC+04:00','UTC+05:00','UTC+06:00','UTC+07:00','UTC+08:00']
                  .map(v => <option key={v} value={v} className="bg-zinc-900">{v}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        {/* Security */}
        <Card title="Security">
          <div className="space-y-3">
            <Field label="Текущий пароль">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurPwd(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              />
            </Field>
            <Field label="Новый пароль">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              />
            </Field>
            <Field label="Повторите новый пароль">
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepPwd(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/25"
              />
            </Field>
          </div>
        </Card>

        {/* Быстрые ссылки */}
        <Card title="Payout history">
          <Link
            href="../payouts"
            className="inline-flex rounded-xl border border-white/25 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10"
          >
            Open payouts
          </Link>
        </Card>
        <Card title="Integrations">
          <div className="text-white/70 text-sm">—</div>
        </Card>
      </div>

      {saveMsg && (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/90">
          {saveMsg}
        </div>
      )}

      {/* Drawer */}
      <NavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </section>
  );
}

/* ——— маленькие UI-утилиты ——— */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/8 backdrop-blur-lg shadow-[0_8px_40px_rgba(0,0,0,0.45)] p-5">
      <div className="text-sm font-medium text-white/90">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-white/60 mb-1">{label}</div>
      {children}
    </label>
  );
}
