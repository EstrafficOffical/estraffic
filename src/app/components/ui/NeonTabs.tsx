import Link from "next/link";

type Props = {
  locale: string;
  active: "login" | "register";
  className?: string;
};

function cls(neon: "rose" | "gray", active = false) {
  if (neon === "rose") {
    return [
      "uppercase font-extrabold tracking-wide",
      "rounded-2xl px-8 py-3 select-none",
      "border-2 bg-transparent text-white",
      active
        ? "border-rose-500/90 shadow-[0_0_0_2px_rgba(255,0,90,.35),0_0_24px_rgba(255,0,90,.55),inset_0_0_12px_rgba(255,0,90,.2)]"
        : "border-rose-500/70 shadow-[0_0_0_2px_rgba(255,0,90,.25),0_0_18px_rgba(255,0,90,.45)]",
      "hover:bg-rose-500/10 transition-colors",
      "focus:outline-none focus:ring-4 focus:ring-rose-500/25",
    ].join(" ");
  }
  // gray neon
  return [
    "uppercase font-extrabold tracking-wide",
    "rounded-2xl px-8 py-3 select-none",
    "border-2 bg-transparent text-white/90",
    active
      ? "border-slate-300/90 shadow-[0_0_0_2px_rgba(148,163,184,.35),0_0_24px_rgba(148,163,184,.55),inset_0_0_12px_rgba(148,163,184,.2)]"
      : "border-slate-300/70 shadow-[0_0_0_2px_rgba(148,163,184,.25),0_0_18px_rgba(148,163,184,.45)]",
    "hover:bg-white/10 transition-colors",
    "focus:outline-none focus:ring-4 focus:ring-slate-300/25",
  ].join(" ");
}

export default function NeonTabs({ locale, active, className = "" }: Props) {
  const isLogin = active === "login";
  return (
    <div className={`flex gap-4 ${className}`}>
      {/* Левая: Войти */}
      <Link
        href={`/${locale}/login`}
        aria-current={isLogin ? "page" : undefined}
        className={cls("rose", isLogin)}
      >
        Войти
      </Link>

      {/* Правая: Регистрация (серый неон) */}
      <Link
        href={`/${locale}/register`}
        aria-current={!isLogin ? "page" : undefined}
        className={cls("gray", !isLogin)}
      >
        Регистрация
      </Link>
    </div>
  );
}
