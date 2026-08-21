import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8">
      <div>
        {eyebrow ? <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">{eyebrow}</div> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-3xl text-[13px] leading-6 text-white/42">{subtitle}</p> : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-white/[0.08] bg-white/[0.025] ${className}`}>{children}</section>;
}

export function PanelHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[14px] font-semibold text-white/92">{title}</h2>
        {description ? <p className="mt-1 text-[12px] text-white/38">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({ label, value, hint, emphasis = false }: { label: string; value: ReactNode; hint?: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${emphasis ? "border-[#7657ff]/35 bg-[#7657ff]/[0.07]" : "border-white/[0.08] bg-white/[0.025]"}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/38">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{value}</div>
      {hint ? <div className="mt-2 text-[11px] text-white/34">{hint}</div> : null}
    </div>
  );
}

export function Pill({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "accent" | "success" | "warning" | "danger" | "info" }) {
  const map = {
    default: "border-white/[0.1] bg-white/[0.035] text-white/55",
    accent: "border-[#7657ff]/30 bg-[#7657ff]/10 text-[#9a87ff]",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-400",
    danger: "border-red-500/25 bg-red-500/10 text-red-400",
    info: "border-sky-500/25 bg-sky-500/10 text-sky-400",
  };
  return <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-[#8068ff]">◇</div>
      <div className="mt-4 text-sm font-medium text-white/75">{title}</div>
      {description ? <div className="mx-auto mt-1 max-w-md text-xs leading-5 text-white/35">{description}</div> : null}
    </div>
  );
}
