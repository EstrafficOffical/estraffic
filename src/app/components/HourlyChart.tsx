// src/components/HourlyChart.tsx
"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Point = { hour: number; clicks: number };

export default function HourlyChart() {
  const [data, setData] = useState<Point[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stats/today", { cache: "no-store" });
        const j = await res.json();
        if (j.ok) setData(j.buckets);
      } catch {}
    })();
  }, []);

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} />
          <YAxis allowDecimals={false} />
          <Tooltip labelFormatter={(h) => `${h}:00`} />
          <Line type="monotone" dataKey="clicks" stroke="#2563eb" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
