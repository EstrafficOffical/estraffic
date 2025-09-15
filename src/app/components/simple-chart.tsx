"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function ActivityChart({ data }: { data: { hour: number; clicks: number }[] }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="clicks" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
