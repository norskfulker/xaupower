import { getAuthUser, createClient } from "@/lib/supabase/server";
import { formatUsd, daysRemaining, RISK_LABEL } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { SurfaceCard } from "@/components/ui/surface-card";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardHowItWorks } from "@/components/dashboard/dashboard-how-it-works";
import type { UserPackage, WalletBalance } from "@/lib/types";
import { packageDisplayLabel, resolveUserPackageTerms } from "@/lib/package-terms";
import { format } from "date-fns";
import { Banknote, Boxes, TrendingUp } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [userPkgRes, historyRes, walletRes] = await Promise.all([
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
      .select("available_usd, pending_usd, profit_pips")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const activePkg = userPkgRes.data;
  const history = (historyRes.data ?? []) as unknown as UserPackage[];
  const wallet = walletRes.data as Pick<
    WalletBalance,
    "available_usd" | "pending_usd" | "profit_pips"
  > | null;

  const daysLeft = daysRemaining(activePkg?.expires_at);
  const terms = resolveUserPackageTerms(
    (activePkg ?? {}) as Pick<UserPackage, "variant_snapshot" | "package_variants">
  );
  const name = packageDisplayLabel(terms);
  const botActive = Boolean(name);
  const profitPips = Number(wallet?.profit_pips ?? 0);

  let elapsedPct = 0;
  if (activePkg?.purchased_at && activePkg.expires_at) {
    const start = new Date(activePkg.purchased_at).getTime();
    const end = new Date(activePkg.expires_at).getTime();
    const span = Math.max(end - start, 1);
    elapsedPct = Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
  }

  return (
    <div className="space-y-8">
      <DashboardQuickActions />

      <div className="grid items-stretch gap-4 sm:grid-cols-3 sm:gap-6">
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
          valueClassName={botActive ? "text-teal" : undefined}
        />
        <StatCard
          label="Profit in pips"
          value={`${profitPips >= 0 ? "+" : ""}${profitPips.toFixed(1)}`}
          hint="Updated by admin"
          icon={TrendingUp}
          valueClassName={profitPips >= 0 ? "text-teal" : "text-hotpink"}
        />
      </div>

      <DashboardHowItWorks />

      <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-2">
        <SurfaceCard className="flex h-full flex-col">
          <p className="text-kicker">Bot details</p>
          {terms && activePkg ? (
            <>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-ink">
                {name}
              </h2>
              <dl className="mt-5 space-y-3.5 text-sm">
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
                  href="/dashboard/packages"
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
        </SurfaceCard>

        <AccessHistoryCards rows={history} />
      </div>
    </div>
  );
}
