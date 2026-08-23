"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "@/lib/format";
import { AdminStatCard } from "@/components/admin/admin-stat-card";

const ORANGE = "#8B2332";
const TEAL = "#2A8F6F";
const HOTPINK = "#BD374D";
const GOLD = "#C4A574";
const PIE_COLORS = [
  ORANGE,
  TEAL,
  GOLD,
  HOTPINK,
  "#7A5C58",
  "#2F6B8A",
  "#B07A3A",
  "#5C7A4A",
  "#8A5A2F",
];

const tooltip = {
  contentStyle: {
    background: "#fff",
    border: "1px solid hsl(340 10% 86%)",
    borderRadius: 12,
    color: "hsl(350 40% 12%)",
    fontFamily: "Inter, sans-serif",
    fontVariantNumeric: "tabular-nums" as const,
  },
  labelStyle: { color: "hsl(340 8% 45%)" },
};

type AnalyticsData = ReturnType<
  typeof import("@/lib/analytics").buildAnalytics
>;

export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="space-y-8">
      <ChartCard title="Revenue over time">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.revenueOverTime}>
            <CartesianGrid stroke="hsl(340 10% 86%)" strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
            <YAxis
              tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }}
              tickFormatter={(v) => formatUsd(v)}
            />
            <Tooltip {...tooltip} formatter={(v) => formatUsd(Number(v))} />
            <Bar dataKey="revenue" fill={ORANGE} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue by package variant">
        {data.revenueByVariant.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.revenueByVariant}
                dataKey="revenue"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={2}
              >
                {data.revenueByVariant.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltip} formatter={(v) => formatUsd(Number(v))} />
              <Legend
                wrapperStyle={{ color: "hsl(340 8% 45%)", fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Deposit funnel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.depositFunnel}>
              <CartesianGrid stroke="hsl(340 10% 86%)" strokeDasharray="4 4" />
              <XAxis dataKey="status" tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="count" fill={GOLD} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Payout funnel">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.payoutFunnel}>
              <CartesianGrid stroke="hsl(340 10% 86%)" strokeDasharray="4 4" />
              <XAxis dataKey="status" tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="count" fill={TEAL} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Signal feed performance">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <AdminStatCard
            label="Win rate"
            value={`${data.signalStats.winRate.toFixed(0)}%`}
          />
          <AdminStatCard
            label="Average win"
            value={formatUsd(data.signalStats.avgWin)}
          />
          <AdminStatCard
            label="Average loss"
            value={formatUsd(data.signalStats.avgLoss)}
          />
        </div>
        {data.signalPnl.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.signalPnl}>
              <CartesianGrid stroke="hsl(340 10% 86%)" strokeDasharray="4 4" />
              <XAxis dataKey="label" tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }}
                tickFormatter={(v) => formatUsd(v)}
              />
              <Tooltip {...tooltip} formatter={(v) => formatUsd(Number(v))} />
              <Line
                type="monotone"
                dataKey="pnl"
                stroke={TEAL}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="User growth">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.userGrowth}>
            <CartesianGrid stroke="hsl(340 10% 86%)" strokeDasharray="4 4" />
            <XAxis dataKey="label" tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "hsl(340 8% 45%)", fontSize: 11 }} />
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ color: "hsl(340 8% 45%)", fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="signups"
              name="Signups"
              stroke={ORANGE}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="activeHolders"
              name="Active package holders"
              stroke={GOLD}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
      <h2 className="mb-3 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="py-12 text-center text-sm text-ink/40">No data in this range.</p>;
}
