"use client";

import RowActions from "./RowActions";

export type OfferRow = {
  id: string;
  title: string;
  geo: string;
  vertical: string;
  cpa: number | null;
  cap?: number | null;
  mode: "Auto" | "Manual";
  hidden: boolean;
  minDeposit?: number | null;
  holdDays?: number | null;
};

export default function OffersTable({
  rows,
  onRowChanged,
  onRowRemoved,
}: {
  rows: OfferRow[];
  onRowChanged: (id: string, patch: Partial<OfferRow>) => void;
  onRowRemoved: (id: string) => void;
}) {
  const fmtMoney = (n?: number | null) => (n == null ? "—" : `$${Number(n).toFixed(2)}`);

  return (
    <div className="overflow-x-auto rounded-2xl bg-white/5 border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="text-white/70">
          <tr className="text-left">
            <Th>Offer</Th>
            <Th>GEO</Th>
            <Th>Vertical</Th>
            <Th>CPA</Th>
            <Th>Cap</Th>
            <Th>Mode</Th>
            <Th>MinDep</Th>
            <Th>Hold</Th>
            <Th>Hidden</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={10} className="p-6 text-white/60">Пусто</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <Td className="font-medium">{r.title}</Td>
                <Td>{r.geo}</Td>
                <Td>{r.vertical}</Td>
                <Td>{r.cpa != null ? `$${Number(r.cpa).toFixed(2)}` : "—"}</Td>
                <Td>{r.cap ?? "—"}</Td>
                <Td><Badge tone={r.mode === "Auto" ? "blue" : "default"}>{r.mode}</Badge></Td>
                <Td>{fmtMoney(r.minDeposit)}</Td>
                <Td>{r.holdDays ?? "—"}</Td>
                <Td>{r.hidden ? <Badge tone="orange">Yes</Badge> : <Badge tone="green">No</Badge>}</Td>
                <Td>
                  <RowActions
                    id={r.id}
                    title={r.title}
                    hidden={r.hidden}
                    onToggledHidden={(next) => onRowChanged(r.id, { hidden: next })}
                    onArchived={() => onRowChanged(r.id, { hidden: true })}
                    onDeleted={() => onRowRemoved(r.id)}
                  />
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 whitespace-nowrap ${className ?? ""}`}>{children}</td>;
}
function Badge({
  children, tone = "default",
}: { children: React.ReactNode; tone?: "default" | "green" | "blue" | "orange" }) {
  const map: Record<string, string> = {
    default: "bg-white/10 border-white/20 text-white/80",
    green: "bg-emerald-400/15 border-emerald-400/30 text-emerald-200",
    blue: "bg-sky-400/15 border-sky-400/30 text-sky-200",
    orange: "bg-amber-400/15 border-amber-400/30 text-amber-200",
  };
  return <span className={`inline-flex items-center rounded-lg px-2 py-1 text-xs border ${map[tone]}`}>{children}</span>;
}
