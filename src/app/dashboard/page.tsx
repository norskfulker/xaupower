import { getAuthUser, createClient, getPriceQuotes } from "@/lib/supabase/server";
import { formatUsd, daysRemaining, RISK_LABEL, formatPrice } from "@/lib/format";
import { PriceSparkline } from "@/components/charts/dashboard-charts";
import { StatCard } from "@/components/ui/stat-card";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import type { UserPackage, WalletBalance } from "@/lib/types";
import { packageDisplayLabel, resolveUserPackageTerms } from "@/lib/package-terms";
import { format, subDays } from "date-fns";
import { Banknote, Boxes, TrendingUp } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [userPkgRes, historyRes, walletRes, closedSignalsRes, quotes] =
    await Promise.all([
      supabase
        .from("user_packages")
        .select(
          "purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, packages(name))"
        )
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("user_packages")
        .select(
          "id, status, purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, packages(name), max_lot_size, profit_target_pct, max_drawdown_pct)"
        )
        .eq("user_id", user!.id)
        .order("purchased_at", { ascending: false }),
      supabase
        .from("wallet_balances")
        .select("available_usd, pending_usd")
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("signals")
        .select("pnl_usd, closed_at")
        .eq("status", "closed")
        .gte("closed_at", subDays(new Date(), 7).toISOString()),
      getPriceQuotes(),
    ]);

  const activePkg = userPkgRes.data;
  const history = (historyRes.data ?? []) as unknown as UserPackage[];
  const wallet = walletRes.data as Pick<
    WalletBalance,
    "available_usd" | "pending_usd"
  > | null;

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

  let elapsedPct = 0;
  if (activePkg?.purchased_at && activePkg.expires_at) {
    const start = new Date(activePkg.purchased_at).getTime();
    const end = new Date(activePkg.expires_at).getTime();
    const span = Math.max(end - start, 1);
    elapsedPct = Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
  }

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
          label="Active bot"
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

      <DashboardQuickActions />

      <div className="rounded-lg bg-white p-5 shadow-sm">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Bot details
          </p>
          {terms && activePkg ? (
            <>
              <h2 className="mt-2 text-2xl font-bold text-ink">{name}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-label">Plan</dt>
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
                    {activePkg.purchased_at
                      ? format(new Date(activePkg.purchased_at), "d MMM yyyy")
                      : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-label">End</dt>
                  <dd className="tabular text-ink">
                    {activePkg.expires_at
                      ? format(new Date(activePkg.expires_at), "d MMM yyyy")
                      : "—"}
                  </dd>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-label">
                    <span>Access period</span>
                    <span>{daysLeft ?? 0} days remaining</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-canvas">
                    <div
                      className="h-full rounded-full bg-orange"
                      style={{ width: `${elapsedPct}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-3">
                  <dt className="text-muted-label">Signal delivery</dt>
                  <dd className="font-semibold text-teal">Online</dd>
                </div>
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/payment"
                  prefetch={false}
                  className={buttonVariants({
                    className: "bg-orange text-white hover:bg-orange/90",
                  })}
                >
                  Renew bot
                </Link>
                <Link
                  href="/dashboard/packages"
                  prefetch={false}
                  className={buttonVariants({
                    variant: "outline",
                    className:
                      "border-border bg-canvas text-ink hover:bg-orange/10",
                  })}
                >
                  Upgrade plan
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-label">
              No active bot. Choose one under Buy Bot.
            </p>
          )}
        </div>

        <AccessHistoryCards rows={history} />
      </div>
    </div>
  );
}
