import { getAuthUser, getOwnProfile } from "@/lib/supabase/server";
import {
  getAccountsForUser,
  getPaymentsForUser,
  getPayoutsForUser,
  getTransactionsForUser,
  getTransfersForUser,
} from "@/lib/supabase/accounts";
import { DashboardHowItWorks } from "@/components/dashboard/dashboard-how-it-works";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { AccessHistoryList } from "@/components/dashboard/access-history-list";
import { StatCard } from "@/components/ui/stat-card";
import { Banknote, Wallet, ArrowRight } from "lucide-react";
import { formatUsd } from "@/lib/format";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — XAUPower",
};

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const [profile, accounts, payments, payouts, transfers, transactions] =
    await Promise.all([
      getOwnProfile(user.id),
      getAccountsForUser(user.id),
      getPaymentsForUser(user.id, 10),
      getPayoutsForUser(user.id, 10),
      getTransfersForUser(user.id, 10),
      getTransactionsForUser(user.id, 50),
    ]);

  const totalAvailable = accounts.reduce(
    (s, a) => s + Number(a.available_usd ?? 0),
    0
  );
  const totalPending = accounts.reduce(
    (s, a) => s + Number(a.pending_usd ?? 0),
    0
  );
  const activeCount = accounts.filter((a) => a.status === "active").length;

  const firstName = (profile?.full_name ?? "").split(" ")[0] || "Member";

  return (
    <div className="space-y-8">
      <DashboardQuickActions />

      <div>
        <p className="text-sm text-muted-label">Welcome back</p>
        <h1 className="mt-1 font-display text-2xl tracking-tight text-ink sm:text-3xl">
          {firstName}
        </h1>
      </div>

      <div className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-6">
        <StatCard
          label="Available"
          value={formatUsd(totalAvailable)}
          hint={
            accounts.length > 1
              ? `${accounts.length} accounts`
              : accounts.length === 1
                ? accounts[0].account_code
                : "Across all accounts"
          }
          icon={Wallet}
        />
        <StatCard
          label="Pending"
          value={formatUsd(totalPending)}
          hint={
            totalPending > 0
              ? "Deposits or withdrawals in flight"
              : "Nothing in flight"
          }
          icon={Banknote}
        />
      </div>

      {accounts.length > 0 && (
        <Link
          href="/dashboard/accounts"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange hover:underline"
        >
          Manage {activeCount} account{activeCount === 1 ? "" : "s"}
          <ArrowRight className="size-4" />
        </Link>
      )}

      <DashboardHowItWorks />

      <AccessHistoryList
        accounts={accounts}
        payments={payments}
        payouts={payouts}
        transfers={transfers}
        transactions={transactions}
      />
    </div>
  );
}
