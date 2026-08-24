"use client";

import {
  MouseEvent,
  useMemo,
  useRef,
  useState,
} from "react";

export type NetworkSeriesRow = {
  day: string;
  clicks: number;
  regs: number;
  ftd: number;
  conversions: number;
  advertiserRevenue: number;
  affiliatePayouts: number;
  grossMargin: number;
};

export type NetworkMetric =
  | "advertiserRevenue"
  | "grossMargin"
  | "ftd"
  | "regs"
  | "clicks";

type Props = {
  series: NetworkSeriesRow[];
  metric: NetworkMetric;
  height?: number;
};

function valueFor(
  row: NetworkSeriesRow,
  metric: NetworkMetric,
) {
  if (metric === "advertiserRevenue") {
    return row.advertiserRevenue;
  }

  if (metric === "grossMargin") {
    return row.grossMargin;
  }

  if (metric === "ftd") {
    return row.ftd;
  }

  if (metric === "regs") {
    return row.regs;
  }

  return row.clicks;
}

function metricLabel(metric: NetworkMetric) {
  if (metric === "advertiserRevenue") {
    return "Network revenue";
  }

  if (metric === "grossMargin") {
    return "Gross margin";
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
  metric: NetworkMetric,
) {
  if (
    metric === "advertiserRevenue" ||
    metric === "grossMargin"
  ) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  return new Intl.NumberFormat("en-US").format(
    Number(value || 0),
  );
}

function formatDate(day: string) {
  const parsed = new Date(
    `${day}T00:00:00.000Z`,
  );

  if (Number.isNaN(parsed.getTime())) {
    return day;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  })
    .format(parsed)
    .toUpperCase();
}

function smoothPath(
  points: Array<{ x: number; y: number }>,
) {
  if (!points.length) return "";

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
    const current = points[index];
    const next = points[index + 1];
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

export default function NetworkAreaChart({
  series,
  metric,
  height = 310,
}: Props) {
  const hostRef =
    useRef<HTMLDivElement>(null);

  const [hovered, setHovered] =
    useState<number | null>(null);

  const chart = useMemo(() => {
    const width = 1200;
    const padLeft = 62;
    const padRight = 20;
    const padTop = 24;
    const padBottom = 42;

    const innerWidth =
      width - padLeft - padRight;
    const innerHeight =
      height - padTop - padBottom;

    const values = series.map((row) =>
      valueFor(row, metric),
    );

    const max = Math.max(
      1,
      ...values,
    );

    const min = Math.min(
      0,
      ...values,
    );

    const span = Math.max(
      1,
      max - min,
    );

    const zeroY =
      padTop +
      innerHeight -
      ((0 - min) / span) *
        innerHeight;

    const points = series.map(
      (row, index) => {
        const x =
          series.length <= 1
            ? padLeft +
              innerWidth / 2
            : padLeft +
              (index /
                (series.length - 1)) *
                innerWidth;

        const y =
          padTop +
          innerHeight -
          ((valueFor(row, metric) -
            min) /
            span) *
            innerHeight;

        return { x, y };
      },
    );

    const line = smoothPath(points);

    const area =
      points.length > 0
        ? `${line} L ${
            points[
              points.length - 1
            ].x.toFixed(2)
          } ${zeroY.toFixed(
            2,
          )} L ${points[0].x.toFixed(
            2,
          )} ${zeroY.toFixed(2)} Z`
        : "";

    return {
      width,
      padLeft,
      padRight,
      padTop,
      padBottom,
      innerWidth,
      innerHeight,
      max,
      min,
      span,
      zeroY,
      points,
      line,
      area,
    };
  }, [series, metric, height]);

  function handleMouseMove(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      !series.length ||
      !hostRef.current
    ) {
      return;
    }

    const rect =
      hostRef.current.getBoundingClientRect();

    const relative =
      (event.clientX - rect.left) /
      rect.width;

    const chartX =
      relative * chart.width;

    const clampedX = Math.max(
      chart.padLeft,
      Math.min(
        chart.width -
          chart.padRight,
        chartX,
      ),
    );

    const ratio =
      chart.innerWidth > 0
        ? (clampedX -
            chart.padLeft) /
          chart.innerWidth
        : 0;

    const nearest =
      series.length <= 1
        ? 0
        : Math.round(
            ratio *
              (series.length - 1),
          );

    setHovered(
      Math.max(
        0,
        Math.min(
          series.length - 1,
          nearest,
        ),
      ),
    );
  }

  if (!series.length) {
    return (
      <div
        className="grid place-items-center text-sm text-white/30"
        style={{ height }}
      >
        No network activity in this period.
      </div>
    );
  }

  const hover =
    hovered == null
      ? null
      : series[hovered];

  const hoverPoint =
    hovered == null
      ? null
      : chart.points[hovered];

  const rawX =
    hoverPoint == null
      ? 50
      : (hoverPoint.x /
          chart.width) *
        100;

  const rawY =
    hoverPoint == null
      ? 50
      : (hoverPoint.y /
          height) *
        100;

  const tooltipX = Math.max(
    9,
    Math.min(91, rawX),
  );

  const tooltipY = Math.max(
    13,
    Math.min(87, rawY),
  );

  const placeLeft =
    rawX > 70;

  const placeBelow =
    rawY < 36;

  const tooltipTransform =
    `${
      placeLeft
        ? "translateX(calc(-100% - 14px))"
        : "translateX(14px)"
    } ` +
    `${
      placeBelow
        ? "translateY(12px)"
        : "translateY(calc(-100% - 12px))"
    }`;

  return (
    <div
      ref={hostRef}
      className="relative overflow-hidden rounded-b-2xl"
      onMouseMove={handleMouseMove}
      onMouseLeave={() =>
        setHovered(null)
      }
    >
      <svg
        viewBox={`0 0 ${chart.width} ${height}`}
        className="block w-full select-none"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label="Network performance chart"
      >
        <defs>
          <linearGradient
            id="nexusNetworkArea"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#7657ff"
              stopOpacity="0.34"
            />
            <stop
              offset="75%"
              stopColor="#7657ff"
              stopOpacity="0.08"
            />
            <stop
              offset="100%"
              stopColor="#7657ff"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(
          (ratio) => {
            const axisValue =
              chart.min +
              chart.span * ratio;

            const y =
              chart.padTop +
              chart.innerHeight -
              chart.innerHeight *
                ratio;

            return (
              <g key={ratio}>
                <line
                  x1={chart.padLeft}
                  x2={
                    chart.width -
                    chart.padRight
                  }
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,.065)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />

                <text
                  x={6}
                  y={y + 4}
                  fill="rgba(255,255,255,.34)"
                  fontSize="12"
                >
                  {formatValue(
                    axisValue,
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
            fill="url(#nexusNetworkArea)"
          />
        ) : null}

        {chart.line ? (
          <path
            d={chart.line}
            fill="none"
            stroke="#7657ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}

        {hoverPoint ? (
          <>
            <line
              x1={hoverPoint.x}
              x2={hoverPoint.x}
              y1={chart.padTop}
              y2={
                chart.padTop +
                chart.innerHeight
              }
              stroke="rgba(255,255,255,.14)"
              vectorEffect="non-scaling-stroke"
            />

            <circle
              cx={hoverPoint.x}
              cy={hoverPoint.y}
              r="5"
              fill="#7657ff"
              stroke="#08090d"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}

        {series.map(
          (row, index) => {
            const show =
              series.length <= 10 ||
              index === 0 ||
              index ===
                series.length - 1 ||
              index %
                Math.ceil(
                  series.length / 7,
                ) ===
                0;

            if (!show) {
              return null;
            }

            const point =
              chart.points[index];

            return (
              <text
                key={`label-${row.day}`}
                x={point.x}
                y={height - 12}
                textAnchor="middle"
                fill="rgba(255,255,255,.28)"
                fontSize="11"
              >
                {row.day.slice(5)}
              </text>
            );
          },
        )}
      </svg>

      {hover && hoverPoint ? (
        <div
          className="pointer-events-none absolute z-20 w-[138px] rounded-xl border border-white/[0.09] bg-[#141419]/95 px-3 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur-xl"
          style={{
            left: `${tooltipX}%`,
            top: `${tooltipY}%`,
            transform:
              tooltipTransform,
            transition:
              "left 110ms cubic-bezier(.22,.61,.36,1), top 110ms cubic-bezier(.22,.61,.36,1), transform 110ms cubic-bezier(.22,.61,.36,1), opacity 90ms ease-out",
          }}
        >
          <div className="text-[10px] font-medium uppercase tracking-[0.11em] text-white/38">
            {formatDate(hover.day)}
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