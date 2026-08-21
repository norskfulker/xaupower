"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { formatUsd } from "@/lib/format";

const Chart = dynamic(() => import("react-apexcharts").then((m) => m.default), {
  ssr: false,
});

const ORANGE = "#8B2332";
const TEAL = "#2A8F6F";
const HOTPINK = "#BD374D";
const GRID = "hsl(340 10% 86%)";
const LABEL = "hsl(340 8% 42%)";

function baseChart(dark = false): ApexOptions {
  return {
    chart: {
      fontFamily: "Inter, sans-serif",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 550, easing: "easeinout" },
      background: "transparent",
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.08)" : GRID,
      strokeDashArray: 4,
    },
    tooltip: {
      theme: dark ? "dark" : "light",
      y: { formatter: (v) => formatUsd(v) },
    },
    xaxis: {
      labels: { style: { fontSize: "11px", colors: dark ? "#B5A08C" : LABEL } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: "11px", colors: dark ? "#B5A08C" : LABEL },
        formatter: (v) => formatUsd(v),
      },
    },
    stroke: { curve: "smooth", width: 2 },
    legend: { show: false },
  };
}

export function PortfolioGrowthChart({
  data,
}: {
  data: { date: string; value: number }[];
}) {
  const options: ApexOptions = {
    ...baseChart(),
    chart: { ...baseChart().chart, type: "area" },
    colors: [ORANGE],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.02,
        stops: [0, 100],
      },
    },
    xaxis: { ...baseChart().xaxis, categories: data.map((d) => d.date) },
  };

  return (
    <div className="h-64 w-full rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 px-1 text-sm font-semibold text-ink">
        Portfolio growth
      </h3>
      <Chart
        options={options}
        series={[{ name: "Value", data: data.map((d) => d.value) }]}
        type="area"
        height={200}
        width="100%"
      />
    </div>
  );
}

export function PriceSparkline({
  data,
}: {
  data: { date: string; pnl: number }[];
}) {
  const options: ApexOptions = {
    ...baseChart(),
    chart: { ...baseChart().chart, type: "line", sparkline: { enabled: true } },
    colors: ["hsl(var(--orange))"],
    stroke: { curve: "straight", width: 2 },
    tooltip: {
      theme: "light",
      y: { formatter: (v) => formatUsd(v) },
    },
  };

  return (
    <Chart
      options={options}
      series={[{ name: "Feed P&L", data: data.map((d) => d.pnl) }]}
      type="line"
      height={140}
      width="100%"
    />
  );
}

export function DailyPnlChart({
  data,
}: {
  data: { date: string; pnl: number }[];
}) {
  const options: ApexOptions = {
    ...baseChart(),
    chart: { ...baseChart().chart, type: "bar" },
    plotOptions: {
      bar: {
        borderRadius: 6,
        columnWidth: "52%",
        distributed: true,
      },
    },
    colors: data.map((d) => (d.pnl >= 0 ? TEAL : HOTPINK)),
    xaxis: { ...baseChart().xaxis, categories: data.map((d) => d.date) },
  };

  return (
    <div className="h-64 w-full rounded-2xl bg-white p-4 shadow-sm">
      <h3 className="mb-2 px-1 text-sm font-semibold text-ink">Daily P&amp;L</h3>
      <Chart
        options={options}
        series={[{ name: "P&L", data: data.map((d) => d.pnl) }]}
        type="bar"
        height={200}
        width="100%"
      />
    </div>
  );
}

export function RevenueChart({
  data,
}: {
  data: { week: string; revenue: number }[];
}) {
  const options: ApexOptions = {
    ...baseChart(),
    chart: { ...baseChart().chart, type: "bar" },
    colors: [ORANGE],
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: "48%" },
    },
    xaxis: {
      ...baseChart().xaxis,
      categories: data.map((d) => d.week),
    },
  };

  return (
    <div className="h-72 w-full rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-2 px-1 text-sm font-semibold text-ink">
        Revenue by week
      </h3>
      <Chart
        options={options}
        series={[{ name: "Revenue", data: data.map((d) => d.revenue) }]}
        type="bar"
        height={240}
        width="100%"
      />
    </div>
  );
}
