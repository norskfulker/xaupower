import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PayoutFlow } from "@/components/payout/payout-flow";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/format";
import { formatRail } from "@/lib/wallets";
import type { Payout, SavedPayoutAddress, WalletBalance } from "@/lib/types";
import { format } from "date-fns";
import { Banknote, Clock, Wallet } from "lucide-react";

export default async function PayoutPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [walletRes, payoutsRes, savedRes] = await Promise.all([
    supabase
      .from("wallet_balances")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("payouts")
      .select("*")
      .eq("user_id", user!.id)
      .order("requested_at", { ascending: false })
      .limit(50),
    supabase
      .from("saved_payout_addresses")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: true }),
  ]);

  const wallet = walletRes.data as WalletBalance | null;
  const payouts = (payoutsRes.data ?? []) as Payout[];
  const sent = payouts.filter((p) => p.status === "sent");
  const pending = payouts.filter((p) =>
    ["requested", "pending_review", "processing"].includes(p.status)
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total withdrawn"
          value={formatUsd(
            sent.reduce((sum, p) => sum + Number(p.amount_usd), 0)
          )}
          hint="Sent payouts"
          icon={Banknote}
        />
        <StatCard
          label="Pending payouts"
          value={formatUsd(
            pending.reduce((sum, p) => sum + Number(p.amount_usd), 0)
          )}
          hint="Requested or processing"
          icon={Clock}
        />
        <StatCard
          label="Available balance"
          value={formatUsd(wallet?.available_usd)}
          hint="Available for withdrawal"
          icon={Wallet}
        />
      </div>

      <div className="rounded-2xl border border-orange/30 bg-orange/10 px-5 py-4 text-sm text-orange">
        Payout requests are reviewed by an admin before funds are sent. Amounts
        cannot exceed your available balance.
      </div>

      <PayoutFlow
        initialWallet={wallet}
        initialPayouts={payouts}
        savedAddresses={(savedRes.data ?? []) as SavedPayoutAddress[]}
        showHistory={false}
      />

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Payout history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Destination</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-label">
                    No payouts yet.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 tabular text-ink/70">
                      {format(new Date(p.requested_at), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 tabular font-semibold text-orange">
                      {formatUsd(p.amount_usd)}
                    </td>
                    <td className="px-4 py-3 text-ink/80">
                      {formatRail(p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-muted-label">
                      {p.destination_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
