"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { formatUsd } from "@/lib/format";

export function PortfolioGrowthChart({
  data,
}: {
  data: { date: string; value: number }[];
}) {
  return (
    <div className="h-64 w-full rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 px-1 text-sm font-semibold text-ink">
        Portfolio growth
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="port" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(20 100% 55%)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(20 100% 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 20% 88%)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={56} />
          <Tooltip
            formatter={(v) => formatUsd(Number(v))}
            contentStyle={{ borderRadius: 12, border: "none" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(20 100% 55%)"
            fill="url(#port)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyPnlChart({
  data,
}: {
  data: { date: string; pnl: number }[];
}) {
  return (
    <div className="h-64 w-full rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 px-1 text-sm font-semibold text-ink">Daily P&amp;L</h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 20% 88%)" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip
            formatter={(v) => formatUsd(Number(v))}
            contentStyle={{ borderRadius: 12, border: "none" }}
          />
          <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.pnl >= 0 ? "hsl(165 100% 43%)" : "hsl(348 100% 62%)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RevenueChart({
  data,
}: {
  data: { week: string; revenue: number }[];
}) {
  return (
    <div className="h-72 w-full rounded-2xl bg-white/5 p-4">
      <h3 className="mb-2 px-1 text-sm font-semibold text-white">
        Revenue by week
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis dataKey="week" tick={{ fill: "#B5A08C", fontSize: 11 }} />
          <YAxis tick={{ fill: "#B5A08C", fontSize: 11 }} width={56} />
          <Tooltip
            formatter={(v) => formatUsd(Number(v))}
            contentStyle={{ borderRadius: 12, border: "none" }}
          />
          <Bar dataKey="revenue" fill="hsl(20 100% 55%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
