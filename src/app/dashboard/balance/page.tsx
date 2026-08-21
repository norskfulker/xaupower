import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { StatCard } from "@/components/ui/stat-card";
import { formatUsd } from "@/lib/format";
import type {
  DepositAddress,
  Payment,
  WalletBalance,
} from "@/lib/types";
import Link from "next/link";
import { Clock, Wallet } from "lucide-react";

export default async function BalancePage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [addressesRes, walletRes, paymentsRes, pkgRes] = await Promise.all([
    supabase.from("deposit_addresses").select("*").eq("is_active", true),
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user!.id)
      .eq("kind", "balance")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_packages")
      .select("id")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const wallet = walletRes.data as WalletBalance | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Trading balance</h1>
        <p className="text-sm text-muted-label">
          Deposit capital the VPS bot trades with. Admin must approve before it
          credits. Withdraw from{" "}
          <Link href="/dashboard/payout" className="font-medium text-orange">
            Payouts
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Available"
          value={formatUsd(wallet?.available_usd)}
          hint="Available for withdrawal"
          icon={Wallet}
        />
        <StatCard
          label="Pending"
          value={formatUsd(wallet?.pending_usd)}
          hint="Awaiting review"
          icon={Clock}
        />
      </div>

      <div className="rounded-lg bg-white shadow-sm p-6">
        <PaymentFlow
          kind="balance"
          depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
          initialPayments={(paymentsRes.data ?? []) as Payment[]}
          hasActivePackage={Boolean(pkgRes.data)}
        />
      </div>
    </div>
  );
}
