"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { PayoutFlow } from "@/components/payout/payout-flow";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  Payout,
  WalletBalance,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function FinanceDialog({
  packages,
  variants,
  depositAddresses,
  wallet,
  payouts,
  payments,
  initialTab = "deposit",
  initialVariantId,
  open,
  onOpenChange,
  defaultOpen = false,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  wallet: WalletBalance | null;
  payouts: Payout[];
  payments: Payment[];
  initialTab?: "deposit" | "withdraw";
  initialVariantId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : uncontrolledOpen;
  const setDialogOpen = onOpenChange ?? setUncontrolledOpen;

  const [tab, setTab] = useState<"deposit" | "withdraw">(initialTab);

  useEffect(() => {
    if (dialogOpen) {
      setTab(initialTab);
    }
  }, [dialogOpen, initialTab]);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-0 bg-white p-0 sm:max-w-2xl sm:rounded-2xl">
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="text-xl font-bold text-ink">Wallet</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs
            value={tab}
            onValueChange={(v) =>
              setTab((v as "deposit" | "withdraw") || "deposit")
            }
          >
            <TabsList className="mt-4 grid h-10 w-full grid-cols-2 bg-canvas p-1">
              <TabsTrigger
                value="deposit"
                className="font-semibold data-active:bg-white data-active:text-ink"
              >
                Deposit
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="font-semibold data-active:bg-white data-active:text-ink"
              >
                Withdraw
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className={cn("mt-4", tab !== "deposit" && "hidden")}>
            <PaymentFlow
              packages={packages}
              variants={variants}
              depositAddresses={depositAddresses}
              initialVariantId={initialVariantId}
              initialPayments={payments}
            />
          </div>
          <div className={cn("mt-4", tab !== "withdraw" && "hidden")}>
            <PayoutFlow initialWallet={wallet} initialPayouts={payouts} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
