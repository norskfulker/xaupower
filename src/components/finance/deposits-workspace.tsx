"use client";

import { useState } from "react";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { Button } from "@/components/ui/button";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
} from "@/lib/types";
import Link from "next/link";

export function DepositsWorkspace({
  packages,
  variants,
  depositAddresses,
  initialVariantId,
  hasActivePackage,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  initialVariantId?: string | null;
  hasActivePackage: boolean;
}) {
  const [open, setOpen] = useState(Boolean(initialVariantId));
  const [kind, setKind] = useState<"package" | "balance">(
    initialVariantId ? "package" : "package"
  );

  return (
    <div className="space-y-4">
      {!open ? (
        <div className="flex flex-wrap gap-3">
          <Button
            className="bg-orange text-white hover:bg-orange/90"
            onClick={() => {
              setKind("package");
              setOpen(true);
            }}
          >
            New deposit
          </Button>
          {hasActivePackage && (
            <Button
              variant="outline"
              className="border-border bg-canvas text-ink hover:bg-orange/10"
              onClick={() => {
                setKind("balance");
                setOpen(true);
              }}
            >
              Add trading balance
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-sm p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">
              {kind === "balance" ? "Trading balance deposit" : "New deposit"}
            </p>
            <Button
              variant="ghost"
              className="text-muted-label hover:text-ink"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
          <PaymentFlow
            kind={kind}
            packages={packages}
            variants={variants}
            depositAddresses={depositAddresses}
            initialVariantId={kind === "package" ? initialVariantId : null}
            hasActivePackage={hasActivePackage}
            showHistory={false}
          />
        </div>
      )}
      <p className="text-xs text-muted-label">
        Crypto only (BTC, ETH, USDT and listed networks). No bank or card
        deposits. Pine script purchases live on{" "}
        <Link href="/dashboard/pine-script" className="text-orange">
          Pine Script
        </Link>
        .
      </p>
    </div>
  );
}
