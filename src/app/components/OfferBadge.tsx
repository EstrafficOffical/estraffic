export default function OfferBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "blue" | "orange" | "pink";
}) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20",
    green:   "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue:    "bg-sky-400/15     border-sky-400/30     text-sky-200",
    orange:  "bg-amber-400/15   border-amber-400/30   text-amber-200",
    pink:    "bg-pink-400/15    border-pink-400/30    text-pink-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs border ${map[tone]}`}>
      {children}
    </span>
  );
}
