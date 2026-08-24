"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NetworkAreaChart, {
  NetworkMetric,
  NetworkSeriesRow,
} from "@/app/components/NetworkAreaChart";

type Props = {
  locale: string;
};

type Payload = {
  series: NetworkSeriesRow[];
};

type RangeDays = 7 | 30 | 90;

const metrics: Array<{
  key: NetworkMetric;
  label: string;
}> = [
  { key: "advertiserRevenue", label: "Revenue" },
  { key: "ftd", label: "FTD" },
  { key: "regs", label: "Registrations" },
  { key: "clicks", label: "Clicks" },
];

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function OwnerPerformanceChart({ locale }: Props) {
  const [metric, setMetric] =
    useState<NetworkMetric>("advertiserRevenue");
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [series, setSeries] = useState<NetworkSeriesRow[]>([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - (rangeDays - 1));

    return {
      from: dateOnly(from),
      to: dateOnly(to),
    };
  }, [rangeDays]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const qs = new URLSearchParams({
        from: new Date(`${range.from}T00:00:00.000Z`).toISOString(),
        to: new Date(`${range.to}T23:59:59.999Z`).toISOString(),
      });

      const response = await fetch(
        `/api/admin/nexus/analytics?${qs.toString()}`,
        { cache: "no-store" },
      );

      const body = await response.json().catch(() => ({}));

      if (!alive) return;

      setSeries(
        response.ok && Array.isArray(body?.series)
          ? body.series
          : [],
      );
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [range]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f14]">
      <div className="flex flex-col gap-4 border-b border-white/[0.07] px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="text-sm font-semibold">Performance</div>
          <div className="mt-1 text-xs text-white/35">
            Whole-network traffic and advertiser revenue.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days as RangeDays)}
              className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                rangeDays === days
                  ? "border-white/10 bg-white/[0.08] text-white"
                  : "border-transparent text-white/38 hover:text-white/70"
              }`}
            >
              {days}D
            </button>
          ))}

          <Link
            href={`/${locale}/admin/analytics`}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/45 transition hover:bg-white/[0.04] hover:text-white"
          >
            Custom
          </Link>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="flex flex-wrap gap-2">
          {metrics.map((item) => (
            <button
              key={item.key}
              onClick={() => setMetric(item.key)}
              className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                metric === item.key
                  ? "border-[#7657ff]/45 bg-[#7657ff]/15 text-[#9a87ff]"
                  : "border-white/[0.08] bg-black/10 text-white/40 hover:text-white/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-3 pt-2">
        {loading ? (
          <div className="grid h-[310px] place-items-center text-xs text-white/30">
            Loading live network performance...
          </div>
        ) : (
          <NetworkAreaChart series={series} metric={metric} />
        )}
      </div>
    </section>
  );
}