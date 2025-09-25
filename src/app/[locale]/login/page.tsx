import LoginForm from './LoginForm';

export default function Page({ params }: { params: { locale: string } }) {
  const { locale } = params;

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen px-4 py-10 text-white/90">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <a
              href={`/${locale}/login`}
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 backdrop-blur hover:bg-white/15"
            >
              ВОЙТИ
            </a>
            <a
              href={`/${locale}/register`}
              className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold tracking-wide text-white/70 shadow-[0_0_24px_rgba(255,255,255,.12)] hover:bg-white/10"
            >
              РЕГИСТРАЦИЯ
            </a>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-extrabold">Вход в кабинет</h1>
      <LoginForm locale={locale} />
      <div className="pt-2 text-center text-sm text-white/60">
        Нет аккаунта?{' '}
        <a
          href={`/${locale}/register`}
          className="underline decoration-white/30 underline-offset-4 hover:text-white"
        >
          Зарегистрироваться
        </a>
      </div>
    </Shell>
  );
}
