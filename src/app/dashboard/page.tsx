import { createClient } from "@/lib/supabase/server";
import { formatUsd, daysRemaining } from "@/lib/format";
import { SignalFeed } from "@/components/signals/signal-feed";
import {
  DailyPnlChart,
  PortfolioGrowthChart,
} from "@/components/charts/dashboard-charts";
import { DashboardFinanceSection } from "@/components/dashboard/dashboard-finance-section";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  Payout,
  Signal,
  WalletBalance,
} from "@/lib/types";
import Link from "next/link";
import { format, subDays } from "date-fns";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    packagesRes,
    variantsRes,
    userPkgRes,
    walletRes,
    signalsRes,
    snapshotsRes,
    payoutsRes,
    paymentsRes,
    addressesRes,
    closedSignalsRes,
  ] = await Promise.all([
    supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
    supabase.from("package_variants").select("*"),
    supabase
      .from("user_packages")
      .select("*, package_variants(*, packages(*))")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("signals")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(50),
    supabase
      .from("portfolio_snapshots")
      .select("*")
      .eq("user_id", user!.id)
      .order("snapshot_at", { ascending: true })
      .limit(30),
    supabase
      .from("payouts")
      .select("*")
      .eq("user_id", user!.id)
      .order("requested_at", { ascending: false })
      .limit(20),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("deposit_addresses").select("*").eq("is_active", true),
    supabase
      .from("signals")
      .select("pnl_usd, closed_at")
      .eq("status", "closed")
      .gte("closed_at", subDays(new Date(), 7).toISOString()),
  ]);

  const packages = (packagesRes.data ?? []) as Package[];
  const variants = (variantsRes.data ?? []).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  })) as PackageVariant[];
  const activePkg = userPkgRes.data;
  const wallet = walletRes.data as WalletBalance | null;
  const signals = (signalsRes.data ?? []) as Signal[];
  const payouts = (payoutsRes.data ?? []) as Payout[];
  const payments = (paymentsRes.data ?? []) as Payment[];
  const addresses = (addressesRes.data ?? []) as DepositAddress[];
  const openCount = signals.filter((s) => s.status === "open").length;

  const feedPnl7d = (closedSignalsRes.data ?? []).reduce(
    (sum, s) => sum + Number(s.pnl_usd ?? 0),
    0
  );

  const portfolioValue =
    Number(wallet?.available_usd ?? 0) + Number(wallet?.pending_usd ?? 0);

  const growthData =
    snapshotsRes.data && snapshotsRes.data.length > 0
      ? snapshotsRes.data.map((s) => ({
          date: format(new Date(s.snapshot_at), "MMM d"),
          value: Number(s.value_usd),
        }))
      : Array.from({ length: 7 }).map((_, i) => ({
          date: format(subDays(new Date(), 6 - i), "MMM d"),
          value: portfolioValue || 1000 + i * 40,
        }));

  const dailyPnl = Array.from({ length: 7 }).map((_, i) => {
    const day = subDays(new Date(), 6 - i);
    const key = format(day, "yyyy-MM-dd");
    const pnl = (closedSignalsRes.data ?? [])
      .filter(
        (s) =>
          s.closed_at && format(new Date(s.closed_at), "yyyy-MM-dd") === key
      )
      .reduce((sum, s) => sum + Number(s.pnl_usd ?? 0), 0);
    return { date: format(day, "MMM d"), pnl };
  });

  const daysLeft = daysRemaining(activePkg?.expires_at);
  const activeVariant = activePkg?.package_variants as
    | (PackageVariant & { packages?: Package })
    | undefined;
  const packageLabel = activeVariant
    ? `${activeVariant.packages?.name ?? "Package"} ${activeVariant.risk_tier} · ${daysLeft ?? 0} days left`
    : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-ink p-5 text-white">
          <p className="text-xs uppercase tracking-wide text-white/60">
            Portfolio value
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular text-orange">
            {formatUsd(portfolioValue)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Feed performance
          </p>
          <p
            className={`mt-2 text-3xl font-extrabold tabular ${
              feedPnl7d >= 0 ? "text-teal" : "text-hotpink"
            }`}
          >
            {formatUsd(feedPnl7d)}
          </p>
          <p className="mt-1 text-xs text-muted-label">Last 7 days</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Active package
          </p>
          {packageLabel ? (
            <p className="mt-2 text-lg font-bold text-ink">{packageLabel}</p>
          ) : (
            <div className="mt-2">
              <p className="text-lg font-bold text-ink">No active package</p>
              <Link
                href="/dashboard/payment"
                className="mt-2 inline-block text-sm font-medium text-orange"
              >
                Choose a plan
              </Link>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Open signals
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular text-ink">
            {openCount}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PortfolioGrowthChart data={growthData} />
        <DailyPnlChart data={dailyPnl} />
      </div>

      <SignalFeed initialSignals={signals} />

      <DashboardFinanceSection
        packages={packages}
        variants={variants}
        depositAddresses={addresses}
        wallet={wallet}
        payouts={payouts}
        payments={payments}
      />
    </>
  );
}
