"use client";

import { PaymentFlow } from "@/components/payment/payment-flow";
import { PayoutFlow } from "@/components/payout/payout-flow";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  WalletBalance,
} from "@/lib/types";
import { format } from "date-fns";
import { Loader2, Wallet } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CashierTab = "deposit" | "withdraw";

type CashierData = {
  depositAddresses: DepositAddress[];
  payments: Payment[];
  hasActivePackage: boolean;
  wallet: WalletBalance | null;
  payouts: Payout[];
  savedAddresses: SavedPayoutAddress[];
};

function CashierPanel({
  open,
  onOpenChange,
  onNavigate,
  initialTab = "deposit",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
  initialTab?: CashierTab;
}) {
  const [tab, setTab] = useState<CashierTab>(initialTab);
  const [loading, setLoading] = useState(false);
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

      const [
        addressesRes,
        paymentsRes,
        pkgRes,
        walletRes,
        payoutsRes,
        savedRes,
      ] = await Promise.all([
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
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("wallet_balances")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
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
        hasActivePackage: Boolean(pkgRes.data),
        wallet: (walletRes.data as WalletBalance | null) ?? null,
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
    if (!open) return;
    setTab(initialTab);
    void load();
  }, [open, load, initialTab]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onNavigate?.();
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden border-border bg-white p-0 text-ink sm:max-w-xl">
        <div className="border-b border-border/50 px-5 pt-5 pb-4">
          <DialogHeader>
            <DialogTitle>Cashier</DialogTitle>
            <DialogDescription className="text-muted-label">
              Deposit, withdraw, and review history — switch tabs below.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-label">
              <Loader2 className="size-4 animate-spin" />
              Loading cashier…
            </div>
          )}

          {!loading && error && (
            <div className="space-y-3 py-8 text-center">
              <p className="text-sm text-hotpink">{error}</p>
              <Button type="button" variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          )}

          {!loading && !error && data && (
            <Tabs
              value={tab}
              onValueChange={(value) => {
                if (value === "deposit" || value === "withdraw") setTab(value);
              }}
            >
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-md">
                <TabsTrigger value="deposit" className="rounded-md px-3">
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="rounded-md px-3">
                  Withdraw
                </TabsTrigger>
              </TabsList>
              <TabsContent value="deposit" className="mt-4 space-y-6">
                <PaymentFlow
                  key={`deposit-${data.payments.length}`}
                  kind="balance"
                  depositAddresses={data.depositAddresses}
                  initialPayments={data.payments.filter((p) => p.kind === "balance")}
                  hasActivePackage={data.hasActivePackage}
                  showHistory={false}
                />
                <DepositHistory rows={data.payments} />
              </TabsContent>
              <TabsContent value="withdraw" className="mt-4 space-y-6">
                <PayoutFlow
                  key={`withdraw-${data.payouts.length}`}
                  initialWallet={data.wallet}
                  initialPayouts={data.payouts}
                  savedAddresses={data.savedAddresses}
                  showHistory={false}
                />
                <PayoutHistory rows={data.payouts} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DepositHistory({ rows }: { rows: Payment[] }) {
  return (
    <div className="rounded-2xl bg-canvas p-4">
      <p className="text-kicker">Deposit history</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-label">No deposits yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 8).map((p) => (
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
          {rows.slice(0, 8).map((p) => (
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

export function CashierDialog({
  className,
  variant = "outline",
  size = "default",
  fullWidth = true,
  initialTab = "deposit",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
  initialTab?: CashierTab;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          "h-11 justify-start gap-2",
          className
        )}
      >
        <Wallet className="size-4 shrink-0" />
        Cashier
      </button>
      <CashierPanel
        open={open}
        onOpenChange={setOpen}
        initialTab={initialTab}
      />
    </>
  );
}

export function CashierNavItem({
  onNavigate,
  active,
  pill,
}: {
  onNavigate?: () => void;
  active?: boolean;
  pill?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          pill
            ? "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition"
            : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
          active
            ? "bg-orange text-white"
            : "text-ink/70 hover:bg-orange/10 hover:text-ink"
        )}
      >
        <Wallet className="size-4 shrink-0" />
        Cashier
      </button>
      <CashierPanel
        open={open}
        onOpenChange={setOpen}
        onNavigate={onNavigate}
      />
    </>
  );
}

export function CashierBottomNavItem({ active }: { active?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
          active ? "text-orange" : "text-ink/60"
        )}
      >
        <Wallet className="size-5 shrink-0" />
        <span className="truncate">Cashier</span>
      </button>
      <CashierPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
