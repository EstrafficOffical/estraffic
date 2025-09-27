'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();

  // Drawer
  const [menuOpen, setMenuOpen] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [basic, setBasic] = useState<BasicUser | null>(null);

  // Editable
  const [name, setName] = useState('');
  const [telegram, setTelegram] = useState('');
  const email = useMemo(() => basic?.email ?? '', [basic]);

  // Local-only preference
  const [tz, setTz] = useState<string>('UTC+03:00');

  // Security (опционально)
  const [currentPassword, setCurPwd] = useState('');
  const [newPassword, setNewPwd] = useState('');
  const [repeatPassword, setRepPwd] = useState('');

  // Save all
  const [pending, startSave] = useTransition();
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Load profile
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
        }
      } finally {
        if (alive) {
          const stored = typeof window !== 'undefined' ? localStorage.getItem('tz') : null;
          setTz(stored || 'UTC+03:00');
          setLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  // Helpers
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

  async function savePassword(): Promise<string | null> {
    // опционально
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

      const e1 = await saveBasic();
      if (e1) errors.push(`Профиль: ${e1}`); else done.push('Профиль');

      const e2 = await savePassword();
      if (e2) errors.push(`Пароль: ${e2}`); else if (currentPassword || newPassword || repeatPassword) done.push('Пароль');

      const e3 = saveTimezone();
      if (e3) errors.push(`Таймзона: ${e3}`); else done.push('Таймзона');

      setSaveMsg(
        errors.length
          ? `Готово: ${done.join(', ')}. Ошибки: ${errors.join('; ')}`
          : 'Все изменения сохранены'
      );

      router.refresh();
    });
  }

  return (
    <section className="relative mx-auto max-w-5xl px-4 py-8 space-y-8 text-white/90">
      {/* Верхняя панель */}
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
        <span className="font-semibold">Estrella</span>

        <div className="ml-auto">
          <button
            onClick={onSaveAll}
            disabled={pending || loading}
            className="rounded-2xl border-2 border-rose-500/70 px-4 py-2 text-sm font-semibold shadow-[0_0_0_2px_rgba(255,0,90,.25),0_0_18px_rgba(255,0,90,.45)] hover:bg-rose-500/10 disabled:opacity-50"
          >
            {pending ? 'Сохраняю…' : 'Сохранить всё'}
          </button>
        </div>
      </div>

      {/* Шапка профиля (без аватара) */}
      <div className="rounded-2xl border border-white/12 bg-white/5 p-5 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
        <div className="flex flex-col gap-1">
          <div className="text-sm text-white/60">Профиль</div>
          <div className="text-xl font-semibold">
            {basic?.name || basic?.email || 'Ваш профиль'}
          </div>
          {basic?.email && <div className="text-sm text-white/60">{basic.email}</div>}
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
            <div className="text-xs text-white/50">* Сохраняется локально.</div>
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
            <div className="text-xs text-white/50">Смена пароля — опционально, если эндпоинт подключён.</div>
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

/* ——— мелкие UI компоненты ——— */
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
