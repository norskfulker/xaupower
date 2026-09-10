import { getAuthUser, createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { StatCard } from "@/components/ui/stat-card";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import { BotAccountCards } from "@/components/dashboard/bot-account-cards";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardHowItWorks } from "@/components/dashboard/dashboard-how-it-works";
import type { LedgerTransaction, Payment, UserPackage, WalletBalance } from "@/lib/types";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import { Banknote, Boxes } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getAuthUser();

  const [activeRes, historyRes, pendingRes, walletRes, profitsRes] =
    await Promise.all([
      supabase
        .from("user_packages")
        .select(
          "id, status, account_code, available_usd, pending_usd, capital_usd, purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, strategy_label, price_usd, packages(name))"
        )
        .eq("user_id", user!.id)
        .eq("status", "active")
        .order("purchased_at", { ascending: false }),
      supabase
        .from("user_packages")
        .select(
          "id, status, purchased_at, expires_at, account_code, available_usd, variant_snapshot, package_variants(risk_tier, strategy_label, price_usd, packages(name))"
        )
        .eq("user_id", user!.id)
        .order("purchased_at", { ascending: false }),
      supabase
        .from("payments")
        .select(
          "id, kind, status, amount_usd, created_at, user_package_id, package_variant_id, variant_snapshot, package_variants(id, risk_tier, price_usd, package_id, packages(name))"
        )
        .eq("user_id", user!.id)
        .eq("kind", "package")
        .in("status", ["pending_review", "waiting", "confirming"])
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_balances")
        .select("available_usd, pending_usd")
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", "bot_return")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const activeBots = (activeRes.data ?? []) as unknown as UserPackage[];
  const history = (historyRes.data ?? []) as unknown as UserPackage[];
  const pendingPayments = (pendingRes.data ?? []) as unknown as Payment[];
  const profitReturns = (profitsRes.data ?? []) as LedgerTransaction[];
  const wallet = walletRes.data as Pick<
    WalletBalance,
    "available_usd" | "pending_usd"
  > | null;

  const botBalance = activeBots.reduce(
    (sum, bot) => sum + Number(bot.available_usd ?? 0),
    0
  );
  const firstTerms = activeBots[0]
    ? resolveUserPackageTerms(activeBots[0])
    : null;
  const firstLabel = packageDisplayLabel(firstTerms);

  return (
    <div className="space-y-8">
      <DashboardQuickActions />

      <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-6">
        <StatCard
          label={
            activeBots.length > 1 ? "Available across bots" : "Available"
          }
          value={formatUsd(botBalance || wallet?.available_usd)}
          hint={
            activeBots.length > 1
              ? `${activeBots.length} active bots`
              : activeBots[0]?.account_code ?? "Per bot account"
          }
          icon={Banknote}
        />
        <StatCard
          label={activeBots.length === 1 ? "Active bot" : "Active bots"}
          value={
            activeBots.length === 0
              ? "None"
              : activeBots.length === 1
                ? (firstLabel ?? "1")
                : String(activeBots.length)
          }
          hint={
            activeBots.length > 1
              ? "Each bot has its own ID and term"
              : activeBots.length === 1
                ? activeBots[0]?.account_code ?? "Running"
                : pendingPayments.length > 0
                  ? `${pendingPayments.length} pending purchase${pendingPayments.length === 1 ? "" : "s"}`
                  : "No active access period"
          }
          icon={Boxes}
          valueClassName={activeBots.length > 0 ? "text-teal" : undefined}
        />
      </div>

      <DashboardHowItWorks />

      <BotAccountCards
        bots={activeBots}
        pendingPurchases={pendingPayments}
        profitReturns={profitReturns}
      />

      <AccessHistoryCards
        rows={history}
        pendingPayments={pendingPayments}
        profitReturns={profitReturns}
      />
    </div>
  );
}
