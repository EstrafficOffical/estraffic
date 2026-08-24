"use client";

import {
  useMemo,
  useRef,
  useState,
} from "react";

export type AffiliateSeriesRow = {
  day: string;
  clicks: number;
  regs: number;
  ftd: number;
  revenue: number;
};

export type AffiliateMetric =
  | "revenue"
  | "ftd"
  | "regs"
  | "clicks";

type Props = {
  series: AffiliateSeriesRow[];
  metric: AffiliateMetric;
  height?: number;
};

function valueFor(
  row: AffiliateSeriesRow,
  metric: AffiliateMetric,
) {
  if (metric === "revenue") {
    return row.revenue;
  }

  if (metric === "ftd") {
    return row.ftd;
  }

  if (metric === "regs") {
    return row.regs;
  }

  return row.clicks;
}

function metricLabel(
  metric: AffiliateMetric,
) {
  if (metric === "revenue") {
    return "Revenue";
  }

  if (metric === "ftd") {
    return "FTD";
  }

  if (metric === "regs") {
    return "Registrations";
  }

  return "Clicks";
}

function formatValue(
  value: number,
  metric: AffiliateMetric,
) {
  if (metric === "revenue") {
    return new Intl.NumberFormat(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      },
    ).format(Number(value || 0));
  }

  return new Intl.NumberFormat(
    "en-US",
  ).format(Number(value || 0));
}

function formatDate(day: string) {
  const parsed = new Date(
    `${day}T00:00:00.000Z`,
  );

  if (
    Number.isNaN(parsed.getTime())
  ) {
    return day;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    },
  )
    .format(parsed)
    .toUpperCase();
}

function smoothPath(
  points: Array<{
    x: number;
    y: number;
  }>,
) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path =
    `M ${points[0].x.toFixed(2)} ` +
    `${points[0].y.toFixed(2)}`;

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const current =
      points[index];
    const next =
      points[index + 1];
    const midX =
      (current.x + next.x) / 2;

    path +=
      ` C ${midX.toFixed(2)} ` +
      `${current.y.toFixed(2)}, ` +
      `${midX.toFixed(2)} ` +
      `${next.y.toFixed(2)}, ` +
      `${next.x.toFixed(2)} ` +
      `${next.y.toFixed(2)}`;
  }

  return path;
}

export default function AffiliatePerformanceChart({
  series,
  metric,
  height = 310,
}: Props) {
  const hostRef =
    useRef<HTMLDivElement>(null);

  const [
    hovered,
    setHovered,
  ] = useState<number | null>(
    null,
  );

  const chart = useMemo(() => {
    const width = 1200;
    const padLeft = 62;
    const padRight = 20;
    const padTop = 24;
    const padBottom = 42;

    const innerWidth =
      width -
      padLeft -
      padRight;
    const innerHeight =
      height -
      padTop -
      padBottom;

    const values =
      series.map((row) =>
        valueFor(row, metric),
      );

    const max = Math.max(
      1,
      ...values,
    );

    const points =
      series.map(
        (row, index) => {
          const x =
            series.length <= 1
              ? padLeft +
                innerWidth / 2
              : padLeft +
                (index /
                  (series.length -
                    1)) *
                  innerWidth;

          const y =
            padTop +
            innerHeight -
            (valueFor(
              row,
              metric,
            ) /
              max) *
              innerHeight;

          return {
            x,
            y,
          };
        },
      );

    const line =
      smoothPath(points);

    const baseline =
      padTop + innerHeight;

    const area =
      points.length
        ? `${line} L ${points[
            points.length - 1
          ].x.toFixed(2)} ${baseline.toFixed(
            2,
          )} L ${points[0].x.toFixed(
            2,
          )} ${baseline.toFixed(
            2,
          )} Z`
        : "";

    const ticks = [
      max,
      max * 0.75,
      max * 0.5,
      max * 0.25,
      0,
    ];

    return {
      width,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerWidth,
      innerHeight,
      baseline,
      points,
      line,
      area,
      ticks,
      max,
    };
  }, [
    series,
    metric,
    height,
  ]);

  function handleMouseMove(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      !series.length ||
      !hostRef.current
    ) {
      return;
    }

    const rect =
      hostRef.current.getBoundingClientRect();

    const relativeX =
      event.clientX - rect.left;

    const normalized =
      Math.min(
        1,
        Math.max(
          0,
          relativeX /
            Math.max(1, rect.width),
        ),
      );

    const index =
      Math.round(
        normalized *
          (series.length - 1),
      );

    setHovered(index);
  }

  const hover =
    hovered != null
      ? series[hovered] || null
      : null;

  const hoverPoint =
    hovered != null
      ? chart.points[hovered] ||
        null
      : null;

  const xLabelIndexes =
    useMemo(() => {
      if (!series.length) {
        return [];
      }

      const maxLabels = 7;
      const indexes =
        new Set<number>();

      if (
        series.length <=
        maxLabels
      ) {
        series.forEach(
          (_, index) =>
            indexes.add(index),
        );
      } else {
        for (
          let slot = 0;
          slot < maxLabels;
          slot += 1
        ) {
          indexes.add(
            Math.round(
              (slot /
                (maxLabels -
                  1)) *
                (series.length -
                  1),
            ),
          );
        }
      }

      return Array.from(
        indexes,
      ).sort(
        (a, b) => a - b,
      );
    }, [series]);

  const tooltip =
    hover && hoverPoint
      ? (() => {
          const tooltipWidth =
            138;
          const tooltipHeight =
            66;

          const xPercent =
            (hoverPoint.x /
              chart.width) *
            100;

          const yPercent =
            (hoverPoint.y /
              height) *
            100;

          const placeLeft =
            xPercent > 72;

          const placeBelow =
            yPercent < 34;

          const rawX =
            (hoverPoint.x /
              chart.width) *
            100;

          const rawY =
            (hoverPoint.y /
              height) *
            100;

          return {
            tooltipWidth,
            tooltipHeight,
            placeLeft,
            placeBelow,
            rawX,
            rawY,
          };
        })()
      : null;

  return (
    <div
      ref={hostRef}
      className="relative overflow-hidden"
      onMouseMove={
        handleMouseMove
      }
      onMouseLeave={() =>
        setHovered(null)
      }
    >
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="block w-full"
        style={{
          height,
        }}
        role="img"
        aria-label={`${metricLabel(
          metric,
        )} performance chart`}
      >
        <defs>
          <linearGradient
            id={`affiliate-area-${metric}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#7657ff"
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor="#7657ff"
              stopOpacity="0.015"
            />
          </linearGradient>

          <filter
            id={`affiliate-glow-${metric}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur
              stdDeviation="2.2"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {chart.ticks.map(
          (tick, index) => {
            const y =
              chart.padTop +
              (index /
                (chart.ticks
                  .length -
                  1)) *
                chart.innerHeight;

            return (
              <g
                key={`${tick}-${index}`}
              >
                <line
                  x1={
                    chart.padLeft
                  }
                  x2={
                    chart.width -
                    chart.padRight
                  }
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.075)"
                  strokeWidth="1"
                />

                <text
                  x="0"
                  y={y + 4}
                  fill="rgba(255,255,255,0.38)"
                  fontSize="12"
                >
                  {formatValue(
                    tick,
                    metric,
                  )}
                </text>
              </g>
            );
          },
        )}

        {chart.area ? (
          <path
            d={chart.area}
            fill={`url(#affiliate-area-${metric})`}
          />
        ) : null}

        {chart.line ? (
          <path
            d={chart.line}
            fill="none"
            stroke="#7657ff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#affiliate-glow-${metric})`}
          />
        ) : null}

        {hoverPoint ? (
          <>
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={chart.padTop}
              y2={
                chart.baseline
              }
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />

            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="5.5"
              fill="#0d0f14"
              stroke="#8c73ff"
              strokeWidth="3"
            />
          </>
        ) : null}

        {xLabelIndexes.map(
          (index) => {
            const point =
              chart.points[index];

            if (!point) {
              return null;
            }

            return (
              <text
                key={
                  series[index]
                    .day
                }
                x={point.x}
                y={
                  height - 10
                }
                textAnchor="middle"
                fill="rgba(255,255,255,0.34)"
                fontSize="11"
              >
                {series[
                  index
                ].day.slice(5)}
              </text>
            );
          },
        )}
      </svg>

      {hover &&
      hoverPoint &&
      tooltip ? (
        <div
          className="pointer-events-none absolute z-20 w-[138px] rounded-xl border border-white/10 bg-[#111218]/95 px-3 py-2.5 shadow-2xl backdrop-blur-md"
          style={{
            left: `${tooltip.rawX}%`,
            top: `${tooltip.rawY}%`,
            transform: `translate(${
              tooltip.placeLeft
                ? "calc(-100% - 14px)"
                : "14px"
            }, ${
              tooltip.placeBelow
                ? "14px"
                : "calc(-100% - 14px)"
            })`,
            transition:
              "left 120ms cubic-bezier(.22,.61,.36,1), top 120ms cubic-bezier(.22,.61,.36,1)",
          }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
            {formatDate(
              hover.day,
            )}
          </div>

          <div className="mt-1 text-[17px] font-semibold leading-none tracking-[-0.025em] text-white">
            {formatValue(
              valueFor(
                hover,
                metric,
              ),
              metric,
            )}
          </div>

          <div className="mt-1.5 text-[10px] leading-none text-white/38">
            {metricLabel(metric)}
          </div>
        </div>
      ) : null}
    </div>
  );
}