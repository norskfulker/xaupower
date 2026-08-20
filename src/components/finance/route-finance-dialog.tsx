"use client";

import { FinanceDialog } from "@/components/finance/finance-dialog";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  Payout,
  WalletBalance,
} from "@/lib/types";

export function RouteFinanceDialog({
  packages,
  variants,
  depositAddresses,
  wallet,
  payouts,
  payments,
  initialTab,
  initialVariantId,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  wallet: WalletBalance | null;
  payouts: Payout[];
  payments: Payment[];
  initialTab: "deposit" | "withdraw";
  initialVariantId?: string | null;
}) {
  return (
    <FinanceDialog
      packages={packages}
      variants={variants}
      depositAddresses={depositAddresses}
      wallet={wallet}
      payouts={payouts}
      payments={payments}
      initialTab={initialTab}
      initialVariantId={initialVariantId}
      defaultOpen
    />
  );
}
