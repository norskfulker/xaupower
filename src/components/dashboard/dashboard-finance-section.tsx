"use client";

import { useState } from "react";
import { FinanceDialog } from "@/components/finance/finance-dialog";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
import { Button } from "@/components/ui/button";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  Payout,
  WalletBalance,
} from "@/lib/types";

export function DashboardFinanceSection({
  packages,
  variants,
  depositAddresses,
  wallet,
  payouts,
  payments,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  wallet: WalletBalance | null;
  payouts: Payout[];
  payments: Payment[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    variants.find((v) => {
      const pkg = packages.find((p) => p.id === v.package_id);
      return pkg?.is_featured && v.risk_tier === "standard";
    })?.id ??
      variants[0]?.id ??
      null
  );
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [variantId, setVariantId] = useState<string | null>(selectedId);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-ink">Plans</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-orange text-white hover:bg-orange/90"
            onClick={() => {
              setTab("deposit");
              setVariantId(selectedId);
              setOpen(true);
            }}
          >
            Payment
          </Button>
          <Button
            className="bg-orange text-white hover:bg-orange/90"
            onClick={() => {
              setTab("withdraw");
              setOpen(true);
            }}
          >
            Payout
          </Button>
        </div>
      </div>

      <PackageVariantPicker
        packages={packages}
        variants={variants}
        selectedId={selectedId}
        onSelect={(v) => setSelectedId(v.id)}
        onBuy={(v) => {
          setSelectedId(v.id);
          setVariantId(v.id);
          setTab("deposit");
          setOpen(true);
        }}
      />

      <FinanceDialog
        packages={packages}
        variants={variants}
        depositAddresses={depositAddresses}
        wallet={wallet}
        payouts={payouts}
        payments={payments}
        initialTab={tab}
        initialVariantId={variantId}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}
