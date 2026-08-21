import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { paymentPackageLabel } from "@/lib/package-terms";
import type { Payment, Payout, Signal, UserPackage } from "@/lib/types";

export type RangeKey = "7" | "30" | "90" | "custom";
export type Grain = "daily" | "weekly" | "monthly";

export function resolveAnalyticsRange(params: {
  range?: string;
  from?: string;
  to?: string;
  grain?: string;
}) {
  const range: RangeKey =
    params.range === "7" || params.range === "90" || params.range === "custom"
      ? params.range
      : "30";
  const grain: Grain =
    params.grain === "daily" || params.grain === "monthly"
      ? params.grain
      : "weekly";

  const now = endOfDay(new Date());
  let from = startOfDay(subDays(now, range === "7" ? 6 : range === "90" ? 89 : 29));
  let to = now;

  if (range === "custom" && params.from && params.to) {
    const parsedFrom = startOfDay(new Date(params.from));
    const parsedTo = endOfDay(new Date(params.to));
    if (!Number.isNaN(parsedFrom.getTime()) && !Number.isNaN(parsedTo.getTime())) {
      from = parsedFrom;
      to = parsedTo;
    }
  }

  return { range, grain, from, to };
}

function inRange(iso: string | null | undefined, from: Date, to: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

function buckets(from: Date, to: Date, grain: Grain) {
  if (grain === "daily") {
    return eachDayOfInterval({ start: from, end: to }).map((d) => ({
      key: format(d, "yyyy-MM-dd"),
      label: format(d, "MMM d"),
      start: startOfDay(d),
      end: endOfDay(d),
    }));
  }
  if (grain === "monthly") {
    return eachMonthOfInterval({ start: from, end: to }).map((d) => ({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMM yyyy"),
      start: startOfMonth(d),
      end: endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    }));
  }
  return eachWeekOfInterval(
    { start: from, end: to },
    { weekStartsOn: 1 }
  ).map((d) => ({
    key: format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    label: format(startOfWeek(d, { weekStartsOn: 1 }), "MMM d"),
    start: startOfWeek(d, { weekStartsOn: 1 }),
    end: endOfDay(new Date(startOfWeek(d, { weekStartsOn: 1 }).getTime() + 6 * 86400000)),
  }));
}

export function buildAnalytics(input: {
  payments: Payment[];
  payouts: Payout[];
  signals: Signal[];
  profiles: { id: string; created_at: string }[];
  packages: Pick<UserPackage, "user_id" | "purchased_at" | "expires_at">[];
  from: Date;
  to: Date;
  grain: Grain;
}) {
  const { from, to, grain } = input;
  const slots = buckets(from, to, grain);

  const revenueOverTime = slots.map((slot) => ({
    label: slot.label,
    revenue: input.payments
      .filter(
        (p) =>
          p.status === "confirmed" &&
          inRange(p.confirmed_at, slot.start, slot.end)
      )
      .reduce((sum, p) => sum + Number(p.amount_usd), 0),
  }));

  const byVariant = new Map<string, number>();
  for (const p of input.payments) {
    if (p.status !== "confirmed" || !inRange(p.confirmed_at, from, to)) continue;
    if ((p.kind ?? "package") !== "package") continue;
    const label = paymentPackageLabel(p) ?? "Unknown variant";
    byVariant.set(label, (byVariant.get(label) ?? 0) + Number(p.amount_usd));
  }
  const revenueByVariant = Array.from(byVariant.entries())
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const depositStatuses = [
    "pending_review",
    "confirmed",
    "rejected",
    "expired",
  ] as const;
  const depositFunnel = depositStatuses.map((status) => ({
    status: status.replace("_", " "),
    count: input.payments.filter(
      (p) => p.status === status && inRange(p.created_at, from, to)
    ).length,
  }));

  const payoutStatuses = [
    "requested",
    "processing",
    "sent",
    "rejected",
    "failed",
  ] as const;
  const payoutFunnel = payoutStatuses.map((status) => ({
    status,
    count: input.payouts.filter(
      (p) => p.status === status && inRange(p.requested_at, from, to)
    ).length,
  }));

  const closed = input.signals
    .filter((s) => s.status === "closed" && inRange(s.closed_at, from, to))
    .sort(
      (a, b) =>
        new Date(a.closed_at ?? 0).getTime() -
        new Date(b.closed_at ?? 0).getTime()
    );
  let running = 0;
  const signalPnl = closed.map((s) => {
    running += Number(s.pnl_usd ?? 0);
    return {
      label: s.closed_at ? format(new Date(s.closed_at), "MMM d") : "",
      pnl: running,
    };
  });
  const wins = closed.filter((s) => Number(s.pnl_usd ?? 0) > 0);
  const losses = closed.filter((s) => Number(s.pnl_usd ?? 0) < 0);
  const winRate = closed.length ? (wins.length / closed.length) * 100 : 0;
  const avgWin = wins.length
    ? wins.reduce((s, x) => s + Number(x.pnl_usd ?? 0), 0) / wins.length
    : 0;
  const avgLoss = losses.length
    ? losses.reduce((s, x) => s + Number(x.pnl_usd ?? 0), 0) / losses.length
    : 0;

  const userGrowth = slots.map((slot) => ({
    label: slot.label,
    signups: input.profiles.filter((p) =>
      inRange(p.created_at, slot.start, slot.end)
    ).length,
    activeHolders: new Set(
      input.packages
        .filter((pkg) => {
          const bought = pkg.purchased_at
            ? new Date(pkg.purchased_at).getTime()
            : 0;
          const expires = pkg.expires_at
            ? new Date(pkg.expires_at).getTime()
            : Number.POSITIVE_INFINITY;
          return bought <= slot.end.getTime() && expires > slot.end.getTime();
        })
        .map((pkg) => pkg.user_id)
    ).size,
  }));

  return {
    revenueOverTime,
    revenueByVariant,
    depositFunnel,
    payoutFunnel,
    signalPnl,
    signalStats: {
      winRate,
      avgWin,
      avgLoss,
      closed: closed.length,
    },
    userGrowth,
  };
}
