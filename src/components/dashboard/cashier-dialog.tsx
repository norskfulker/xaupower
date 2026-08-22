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
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type {
  DepositAddress,
  Payment,
  Payout,
  SavedPayoutAddress,
  WalletBalance,
} from "@/lib/types";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}) {
  const [tab, setTab] = useState<CashierTab>("deposit");
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
          .eq("kind", "balance")
          .order("created_at", { ascending: false })
          .limit(20),
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
          .limit(20),
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
    setTab("deposit");
    void load();
  }, [open, load]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) onNavigate?.();
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-full max-w-lg flex-col gap-0 overflow-hidden border-border bg-white p-0 text-ink sm:max-w-lg sm:rounded-2xl">
        <div className="border-b border-border px-5 pt-5 pb-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ink">
              Cashier
            </DialogTitle>
            <DialogDescription className="text-muted-label">
              Deposit capital or withdraw available balance — switch tabs below.
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
              <TabsList className="grid h-10 w-full grid-cols-2">
                <TabsTrigger value="deposit" className="px-3">
                  Deposit
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="px-3">
                  Withdraw
                </TabsTrigger>
              </TabsList>
              <TabsContent value="deposit" className="mt-4">
                <PaymentFlow
                  key={`deposit-${data.payments.length}`}
                  kind="balance"
                  depositAddresses={data.depositAddresses}
                  initialPayments={data.payments}
                  hasActivePackage={data.hasActivePackage}
                  showHistory={false}
                />
              </TabsContent>
              <TabsContent value="withdraw" className="mt-4">
                <PayoutFlow
                  key={`withdraw-${data.payouts.length}`}
                  initialWallet={data.wallet}
                  initialPayouts={data.payouts}
                  savedAddresses={data.savedAddresses}
                  showHistory={false}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CashierDialog({
  className,
  variant = "outline",
  size = "default",
  fullWidth = true,
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
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
      <CashierPanel open={open} onOpenChange={setOpen} />
    </>
  );
}

export function CashierNavItem({
  onNavigate,
  active,
}: {
  onNavigate?: () => void;
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
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
