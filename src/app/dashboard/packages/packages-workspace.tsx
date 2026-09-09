"use client";

import { useState } from "react";
import { PackagesCatalog } from "@/app/dashboard/packages/packages-catalog";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import type {
  DepositAddress,
  LedgerTransaction,
  Package,
  PackageVariant,
  Payment,
  UserPackage,
} from "@/lib/types";

export function PackagesWorkspace({
  packages,
  variants,
  depositAddresses,
  history,
  pendingPayments: initialPending,
  profitReturns = [],
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  history: UserPackage[];
  pendingPayments: Payment[];
  profitReturns?: LedgerTransaction[];
}) {
  const [pendingPayments, setPendingPayments] = useState(initialPending);

  function handlePurchaseSubmitted(payment: Payment) {
    setPendingPayments((prev) => {
      if (prev.some((p) => p.id === payment.id)) return prev;
      return [payment, ...prev];
    });
  }

  return (
    <div className="space-y-8">
      <PackagesCatalog
        packages={packages}
        variants={variants}
        depositAddresses={depositAddresses}
        onPurchaseSubmitted={handlePurchaseSubmitted}
      />
      <AccessHistoryCards
        rows={history}
        pendingPayments={pendingPayments}
        profitReturns={profitReturns}
      />
    </div>
  );
}
