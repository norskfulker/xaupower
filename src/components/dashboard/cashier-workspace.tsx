"use client";

import Link from "next/link";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { PayoutFlow } from "@/components/payout/payout-flow";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import { cn } from "@/lib/utils";
import type {
  DepositAddress,
  Payment,
  Payout,
  SavedPayoutAddress,
  UserPackage,
} from "@/lib/types";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  Loader2,
  Lock,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export type CashierTab = "balance" | "withdraw";

type CashierData = {
  depositAddresses: DepositAddress[];
  payments: Payment[];
  botAccounts: UserPackage[];
  payouts: Payout[];
  savedAddresses: SavedPayoutAddress[];
};

export function CashierWorkspace({
  initialTab = "balance",
  initialBotId,
  compact = false,
}: {
  initialTab?: CashierTab;
  initialBotId?: string;
  compact?: boolean;
}) {
  const [tab, setTab] = useState<CashierTab>(
    initialTab === "withdraw" ? "withdraw" : "balance"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CashierData | null>(null);
  const [selectedBotId, setSelectedBotId] = useState(initialBotId ?? "");

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
            .limit(40),
          supabase
            .from("user_packages")
            .select(
              "id, account_code, available_usd, pending_usd, capital_usd, status, variant_snapshot, package_variants(risk_tier, strategy_label, price_usd, packages(name))"
            )
            .eq("user_id", user.id)
            .eq("status", "active")
            .order("purchased_at", { ascending: false }),
          supabase
            .from("payouts")
            .select("*")
            .eq("user_id", user.id)
            .order("requested_at", { ascending: false })
            .limit(40),
          supabase
            .from("saved_payout_addresses")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true }),
        ]);

      setData({
        depositAddresses: (addressesRes.data ?? []) as DepositAddress[],
        payments: (paymentsRes.data ?? []) as Payment[],
        botAccounts: (accountsRes.data ?? []) as unknown as UserPackage[],
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

  useEffect(() => {
    if (!data?.botAccounts.length) return;
    if (
      selectedBotId &&
      data.botAccounts.some((b) => b.id === selectedBotId)
    ) {
      return;
    }
    const fallback =
      initialBotId && data.botAccounts.some((b) => b.id === initialBotId)
        ? initialBotId
        : data.botAccounts[0]?.id ?? "";
    setSelectedBotId(fallback);
  }, [data, initialBotId, selectedBotId]);

  const stats = useMemo(() => {
    if (!data) return null;
    const totalAvailable = data.botAccounts.reduce(
      (sum, b) => sum + Number(b.available_usd ?? 0),
      0
    );
    return {
      totalAvailable,
      botCount: data.botAccounts.length,
    };
  }, [data]);

  const withdrawLocked =
    !stats || stats.totalAvailable <= 0 || stats.botCount === 0;

  useEffect(() => {
    if (withdrawLocked && tab === "withdraw") {
      setTab("balance");
    }
  }, [withdrawLocked, tab]);

  return (
    <TooltipProvider>
      <div className={cn("space-y-6", compact && "space-y-4")}>
        {!compact && (
          <div>
            <h1 className="mt-1 font-display text-2xl tracking-tight text-ink sm:text-3xl">
              Bot funds
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-label">
              Add funds, cash out, or buy another bot — per bot account.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-label">
            <Loader2 className="size-4 animate-spin" />
            Loading cashier…
          </div>
        )}

        {!loading && error && (
          <SurfaceCard className="py-12 text-center">
            <p className="text-sm text-hotpink">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </SurfaceCard>
        )}

        {!loading && !error && data && stats && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatChip
                label="Available"
                value={formatUsd(stats.totalAvailable)}
                hint={
                  stats.botCount > 1
                    ? `${stats.botCount} bots`
                    : "Selected bot"
                }
                icon={Wallet}
              />
              <StatChip
                label="Active bots"
                value={String(stats.botCount)}
                hint={
                  stats.botCount === 0
                    ? "Buy a plan to start"
                    : "Separate IDs & balances"
                }
                icon={Bot}
              />
            </div>

            {data.botAccounts.length > 0 && (
              <BotPicker
                bots={data.botAccounts}
                selectedId={selectedBotId}
                onSelect={setSelectedBotId}
              />
            )}

            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (value == null) return;
                if (value === "withdraw" && withdrawLocked) return;
                setTab(value as CashierTab);
              }}
              className="w-full"
            >
              <TabsList className="grid h-auto w-full grid-cols-2">
                <TabsTrigger value="balance" className="gap-1.5">
                  <ArrowDownLeft className="size-3.5" />
                  Deposit
                </TabsTrigger>
                {withdrawLocked ? (
                  <Tooltip>
                    <TooltipTrigger
                      delay={0}
                      className="relative inline-flex h-full flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground/60 opacity-70"
                    >
                      <Lock className="size-3.5" />
                      Withdraw
                    </TooltipTrigger>
                    <TooltipContent>
                      Purchase a Bot to unlock payouts.
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <TabsTrigger value="withdraw" className="gap-1.5">
                    <ArrowUpRight className="size-3.5" />
                    Withdraw
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="balance" className="mt-5">
                <SurfaceCard padding="lg" className="min-w-0">
                  <TabHeading
                    title="Add funds"
                    body="Top up the selected bot."
                  />
                  {data.botAccounts.length === 0 ? (
                    <EmptyBots />
                  ) : (
                    <div className="mt-5">
                      <PaymentFlow
                        key={`balance-${selectedBotId}`}
                        kind="balance"
                        embedded
                        hideBotSelect
                        depositAddresses={data.depositAddresses}
                        initialPayments={data.payments.filter(
                          (p) => p.kind === "balance"
                        )}
                        botAccounts={data.botAccounts}
                        initialBotAccountId={selectedBotId}
                        showHistory={false}
                      />
                    </div>
                  )}
                </SurfaceCard>
              </TabsContent>

              <TabsContent value="withdraw" className="mt-5">
                <SurfaceCard padding="lg" className="min-w-0">
                  <TabHeading
                    title="Cash out"
                    body="Request a payout from the selected bot."
                  />
                  {data.botAccounts.length === 0 ? (
                    <EmptyBots />
                  ) : (
                    <div className="mt-5">
                      <PayoutFlow
                        key={`withdraw-${selectedBotId}`}
                        embedded
                        hideBotSelect
                        botAccounts={data.botAccounts}
                        initialPayouts={data.payouts}
                        savedAddresses={data.savedAddresses}
                        initialBotAccountId={selectedBotId}
                        showHistory={false}
                      />
                    </div>
                  )}
                </SurfaceCard>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function EmptyBots() {
  return (
    <div className="mt-6 rounded-2xl bg-canvas p-8 text-center">
      <Bot className="mx-auto size-10 text-orange" />
      <h2 className="mt-4 font-display text-lg text-ink">No bot accounts yet</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-label">
        Buy a plan to get a bot ID. After approval you can add funds and cash
        out from this page.
      </p>
      <Link
        href="/dashboard/packages"
        prefetch={false}
        className={cn(
          buttonVariants({}),
          "mt-6 inline-flex h-11 bg-orange text-white hover:bg-orange/90"
        )}
      >
        Browse plans
      </Link>
    </div>
  );
}

function StatChip({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-kicker">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="text-metric mt-2 text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted-label">{hint}</p>
    </div>
  );
}

function TabHeading({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted-label">{body}</p>
    </div>
  );
}

function BotPicker({
  bots,
  selectedId,
  onSelect,
}: {
  bots: UserPackage[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (bots.length <= 1) {
    const bot = bots[0];
    if (!bot) return null;
    const terms = resolveUserPackageTerms(bot);
    return (
      <div className="rounded-2xl bg-card px-5 py-4 shadow-card sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-base text-orange">
              {bot.account_code}
            </p>
            <p className="text-sm text-muted-label">
              {packageDisplayLabel(terms) ?? "Active bot"}
            </p>
          </div>
          <p className="font-display text-lg tabular text-ink">
            {formatUsd(bot.available_usd ?? 0)}
            <span className="ml-1 text-xs font-medium text-muted-label">
              avail.
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-ink">
        Choose bot ({bots.length} active)
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bots.map((bot) => {
          const active = bot.id === selectedId;
          const terms = resolveUserPackageTerms(bot);
          return (
            <button
              key={bot.id}
              type="button"
              onClick={() => onSelect(bot.id)}
              className={cn(
                "flex flex-col rounded-2xl border px-4 py-3 text-left transition",
                active
                  ? "border-orange bg-orange/10 ring-2 ring-orange shadow-sm"
                  : "border-border bg-card shadow-card hover:border-orange/40"
              )}
            >
              <span className="font-display text-sm text-orange">
                {bot.account_code}
              </span>
              <span className="mt-0.5 truncate text-xs text-muted-label">
                {terms?.package_name ?? "Bot"}
              </span>
              <span className="mt-2 font-display text-sm tabular text-ink">
                {formatUsd(bot.available_usd ?? 0)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
