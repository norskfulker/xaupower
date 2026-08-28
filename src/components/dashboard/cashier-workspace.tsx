"use client";

import Link from "next/link";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { PayoutFlow } from "@/components/payout/payout-flow";
import { Button, buttonVariants } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status-pill";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";
import { formatRail } from "@/lib/wallets";
import { cn } from "@/lib/utils";
import type {
  DepositAddress,
  Payment,
  Payout,
  SavedPayoutAddress,
  UserPackage,
} from "@/lib/types";
import { format } from "date-fns";
import { Cpu, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type CashierTab = "balance" | "buybot" | "withdraw";

type CashierData = {
  depositAddresses: DepositAddress[];
  payments: Payment[];
  botAccounts: UserPackage[];
  payouts: Payout[];
  savedAddresses: SavedPayoutAddress[];
};

export function CashierWorkspace({
  initialTab = "balance",
}: {
  initialTab?: CashierTab;
}) {
  const [tab, setTab] = useState<CashierTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CashierData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Sign in to use cashier.");
        setData(null);
        return;
      }

      const [addressesRes, paymentsRes, accountsRes, payoutsRes, savedRes] =
        await Promise.all([
          supabase.from("deposit_addresses").select("*").eq("is_active", true),
          supabase
            .from("payments")
            .select("*")
            .eq("user_id", user.id)
            .in("kind", ["balance", "package"])
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("user_packages")
            .select(
              "id, account_code, available_usd, pending_usd, status, variant_snapshot"
            )
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("purchased_at", { ascending: false }),
          supabase
            .from("payouts")
            .select("*")
            .eq("user_id", user.id)
            .order("requested_at", { ascending: false })
            .limit(30),
          supabase
            .from("saved_payout_addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
        ]);

      setData({
        depositAddresses: (addressesRes.data ?? []) as DepositAddress[],
        payments: (paymentsRes.data ?? []) as Payment[],
        botAccounts: (accountsRes.data ?? []) as UserPackage[],
        payouts: (payoutsRes.data ?? []) as Payout[],
        savedAddresses: (savedRes.data ?? []) as SavedPayoutAddress[],
      });
    } catch {
      setError("Could not load cashier. Try again.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <SurfaceCard padding="lg">
        <p className="text-kicker">Cashier</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-ink">
          Manage your bot funds
        </h1>
        <p className="mt-2 text-sm text-muted-label">
          Add balance, buy a bot, or withdraw from your bot account.
        </p>
      </SurfaceCard>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-label">
          <Loader2 className="size-4 animate-spin" />
          Loading cashier…
        </div>
      )}

      {!loading && error && (
        <SurfaceCard className="py-8 text-center">
          <p className="text-sm text-hotpink">{error}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void load()}>
            Retry
          </Button>
        </SurfaceCard>
      )}

      {!loading && !error && data && (
        <SurfaceCard padding="lg">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              if (
                value === "balance" ||
                value === "buybot" ||
                value === "withdraw"
              ) {
                setTab(value);
              }
            }}
          >
            <TabsList className="grid h-11 w-full grid-cols-3 rounded-md">
              <TabsTrigger value="balance" className="rounded-md px-2 text-xs sm:text-sm">
                Add balance
              </TabsTrigger>
              <TabsTrigger value="buybot" className="rounded-md px-2 text-xs sm:text-sm">
                Buy bot
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="rounded-md px-2 text-xs sm:text-sm">
                Withdraw
              </TabsTrigger>
            </TabsList>

            <TabsContent value="balance" className="mt-6 space-y-6">
              <PaymentFlow
                key={`balance-${data.botAccounts.length}-${data.payments.length}`}
                kind="balance"
                depositAddresses={data.depositAddresses}
                initialPayments={data.payments.filter((p) => p.kind === "balance")}
                botAccounts={data.botAccounts}
                showHistory={false}
              />
              <DepositHistory rows={data.payments} />
            </TabsContent>

            <TabsContent value="buybot" className="mt-6 space-y-4">
              <div className="rounded-2xl bg-canvas p-8 text-center">
                <Cpu className="mx-auto size-10 text-orange" />
                <h3 className="mt-4 text-lg font-bold text-ink">Buy a bot plan</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-label">
                  Choose Assay, Bullion, or Vault on the packages page. Each plan
                  includes a fixed strategy — no risk slider.
                </p>
                <Link
                  href="/dashboard/packages"
                  className={cn(
                    buttonVariants({}),
                    "mt-6 inline-flex h-11 bg-orange text-white hover:bg-orange/90"
                  )}
                >
                  Go to Buy Bot
                </Link>
              </div>
            </TabsContent>

            <TabsContent value="withdraw" className="mt-6 space-y-6">
              <PayoutFlow
                key={`withdraw-${data.payouts.length}`}
                botAccounts={data.botAccounts}
                initialPayouts={data.payouts}
                savedAddresses={data.savedAddresses}
                showHistory={false}
              />
              <PayoutHistory rows={data.payouts} />
            </TabsContent>
          </Tabs>
        </SurfaceCard>
      )}
    </div>
  );
}

function DepositHistory({ rows }: { rows: Payment[] }) {
  const deposits = rows.filter((p) => p.kind === "balance" || p.kind === "package");
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-kicker">Deposit history</p>
      {deposits.length === 0 ? (
        <p className="mt-3 text-sm text-muted-label">No deposits yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {deposits.slice(0, 12).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block font-semibold tabular text-ink">
                  {formatUsd(p.amount_usd)}
                </span>
                <span className="block truncate text-xs text-muted-label">
                  {formatRail(p.currency)} ·{" "}
                  {format(new Date(p.created_at), "d MMM yyyy")}
                </span>
              </span>
              <StatusPill status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PayoutHistory({ rows }: { rows: Payout[] }) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-kicker">Payout history</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-label">No payouts yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 12).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block font-semibold tabular text-ink">
                  {formatUsd(p.amount_usd)}
                </span>
                <span className="block truncate text-xs text-muted-label">
                  {formatRail(p.currency)} ·{" "}
                  {format(new Date(p.requested_at), "d MMM yyyy")}
                </span>
              </span>
              <StatusPill status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
