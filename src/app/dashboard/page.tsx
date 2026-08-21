import { getAuthUser, createClient, getPriceQuotes } from "@/lib/supabase/server";
import { formatUsd, daysRemaining, RISK_LABEL, formatPrice } from "@/lib/format";
import { SignalFeed } from "@/components/signals/signal-feed";
import { PriceSparkline } from "@/components/charts/dashboard-charts";
import { StatCard } from "@/components/ui/stat-card";
import type { Signal, UserPackage, WalletBalance } from "@/lib/types";
import { packageDisplayLabel, resolveUserPackageTerms } from "@/lib/package-terms";
import { format, subDays } from "date-fns";
import { Banknote, Boxes, Cpu, Radio, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [
    userPkgRes,
    walletRes,
    signalsRes,
    closedSignalsRes,
    quotes,
  ] = await Promise.all([
    supabase
      .from("user_packages")
      .select(
        "purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, packages(name))"
      )
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("wallet_balances")
      .select("available_usd, pending_usd")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("signals")
      .select(
        "id, pair, direction, entry_price, stop_loss, take_profit, status, pnl_usd, opened_at, closed_at, created_by"
      )
      .order("opened_at", { ascending: false })
      .limit(50),
    supabase
      .from("signals")
      .select("pnl_usd, closed_at")
      .eq("status", "closed")
      .gte("closed_at", subDays(new Date(), 7).toISOString()),
    getPriceQuotes(),
  ]);

  const activePkg = userPkgRes.data;
  const wallet = walletRes.data as Pick<
    WalletBalance,
    "available_usd" | "pending_usd"
  > | null;
  const signals = (signalsRes.data ?? []) as Signal[];

  const feedPnl7d = (closedSignalsRes.data ?? []).reduce(
    (sum, s) => sum + Number(s.pnl_usd ?? 0),
    0
  );

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
  const terms = resolveUserPackageTerms(
    (activePkg ?? {}) as Pick<UserPackage, "variant_snapshot" | "package_variants">
  );
  const name = packageDisplayLabel(terms);
  const quote = quotes.find((q) => q.pair === "XAUUSD");
  const change = Number(quote?.change_pct ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Available balance"
          value={formatUsd(wallet?.available_usd)}
          hint="Available for withdrawal"
          icon={Banknote}
        />
        <StatCard
          label="Active package"
          value={name ?? "None"}
          hint={
            name
              ? `${daysLeft ?? 0} days remaining`
              : "No active access period"
          }
          icon={Boxes}
        />
        <StatCard
          label="Feed performance"
          value={`${feedPnl7d >= 0 ? "+" : ""}${formatUsd(feedPnl7d)}`}
          hint="7-day feed performance"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-label">
                XAUUSD
              </p>
              <p className="mt-2 text-4xl font-extrabold tabular text-orange">
                {quote ? formatPrice(quote.price, 2) : "—"}
              </p>
              <p
                className={`mt-1 text-sm tabular ${
                  change >= 0 ? "text-teal" : "text-hotpink"
                }`}
              >
                {change >= 0 ? "+" : ""}
                {change.toFixed(2)}%
              </p>
            </div>
            <span className="rounded-lg bg-orange/10 px-2.5 py-1 text-[11px] font-semibold text-orange">
              Live
            </span>
          </div>
          <div className="mt-4">
            <PriceSparkline data={dailyPnl} />
            <p className="mt-1 text-[11px] text-muted-label">
              Sparkline shows 7-day signal-feed P&amp;L, not a personal yield.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Package details
          </p>
          {terms ? (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">Package</dt>
                <dd className="font-semibold text-ink">{terms.package_name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">Risk tier</dt>
                <dd className="font-semibold text-ink">
                  {RISK_LABEL[terms.risk_tier]}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">Start</dt>
                <dd className="tabular text-ink">
                  {activePkg?.purchased_at
                    ? format(new Date(activePkg.purchased_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">End</dt>
                <dd className="tabular text-ink">
                  {activePkg?.expires_at
                    ? format(new Date(activePkg.expires_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3">
                <dt className="text-muted-label">Signal delivery</dt>
                <dd className="font-semibold text-teal">Online</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-label">
              No active package. Choose one under My Packages.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <SignalFeed initialSignals={signals} />
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm lg:col-span-2">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Quick actions
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/payment"
              prefetch={false}
              className={buttonVariants({
                className:
                  "h-11 w-full justify-start gap-2 bg-orange text-white hover:bg-orange/90",
              })}
            >
              <Cpu className="size-4" />
              Buy Bot
            </Link>
            <Link
              href="/dashboard/signals-setup"
              prefetch={false}
              className={buttonVariants({
                variant: "outline",
                className: "h-11 w-full justify-start gap-2",
              })}
            >
              <Radio className="size-4" />
              Buy Signal
            </Link>
            <Link
              href="/dashboard/balance"
              prefetch={false}
              className={buttonVariants({
                variant: "outline",
                className: "h-11 w-full justify-start gap-2",
              })}
            >
              <Wallet className="size-4" />
              Deposit
            </Link>
            <Link
              href="/dashboard/payout"
              prefetch={false}
              className={buttonVariants({
                variant: "outline",
                className: "h-11 w-full justify-start gap-2",
              })}
            >
              <Banknote className="size-4" />
              Withdraw
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
