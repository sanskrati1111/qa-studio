"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface TrendPoint {
  label: string; // formatted date/time for the x-axis
  successRate: number;
  url: string; // for tooltip context
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
        <p className="text-[13px] text-ink-dim">
          Run at least 2 comparisons to see a success rate trend here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="text-[12px] font-medium text-ink-dim mb-4">
        Success rate over time — most recent {data.length} runs
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3E2DD" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#6B7078", fontFamily: "var(--font-mono)" }}
            axisLine={{ stroke: "#E3E2DD" }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#6B7078", fontFamily: "var(--font-mono)" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#FFFFFF",
              border: "1px solid #E3E2DD",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(0)}%`, "Success rate"]}
          />
          <Line
            type="monotone"
            dataKey="successRate"
            stroke="#0F7B6C"
            strokeWidth={2}
            dot={{ r: 3, fill: "#0F7B6C" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
