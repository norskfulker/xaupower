"use client";

import { useState } from "react";
import { BotPurchaseFlow } from "@/components/packages/bot-purchase-flow";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  displayStrategyLabel,
  formatAccessTerm,
  getDefaultVariant,
} from "@/lib/package-display";
import { formatUsdInteger } from "@/lib/format";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";

export function PackagesCatalog({
  packages,
  variants,
  depositAddresses,
  onPurchaseSubmitted,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  onPurchaseSubmitted?: (payment: Payment) => void;
}) {
  const reduceMotion = useReducedMotion();
  const ordered = [...packages].sort(
    (a, b) => Number(a.price_usd) - Number(b.price_usd)
  );
  const [selected, setSelected] = useState<Package | null>(null);

  const selectedVariant = selected
    ? getDefaultVariant(selected.id, variants)
    : null;

  const headerTerm =
    ordered.length > 0 ? formatAccessTerm(ordered[0]) : "3 weeks";

  return (
    <>
      <SurfaceCard padding="lg">
        <p className="text-kicker">Plans</p>
        <h2 className="mt-2 font-display text-2xl tracking-tight text-ink">
          Buy Bot
        </h2>
        <p className="mt-2 text-sm text-muted-label">
          {headerTerm} · tap a plan to buy
        </p>

        <div className="mt-8 grid items-stretch gap-4 sm:gap-6 lg:grid-cols-3">
          {ordered.map((pkg, index) => (
            <motion.button
              key={pkg.id}
              type="button"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : index * 0.05 }}
              whileHover={reduceMotion ? undefined : { y: -2 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              onClick={() => setSelected(pkg)}
              className={cn(
                "relative flex h-full min-h-[18rem] flex-col rounded-2xl p-6 text-left shadow-card transition sm:p-7",
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange",
                pkg.is_featured
                  ? "bg-orange/10 ring-1 ring-orange/30"
                  : "bg-canvas"
              )}
            >
              {pkg.is_featured && (
                <span className="absolute -top-2.5 left-4 rounded-xl bg-orange px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most chosen
                </span>
              )}
              <p className="text-kicker text-orange">{pkg.name}</p>
              <p className="text-metric mt-4 text-ink">
                {formatUsdInteger(pkg.price_usd)}
              </p>
              <p className="mt-2 text-xs text-muted-label">
                {formatAccessTerm(pkg)}
              </p>
              {pkg.tagline && (
                <p className="mt-3 text-sm leading-relaxed text-muted-label">
                  {pkg.tagline}
                </p>
              )}
              <p className="mt-auto pt-5 text-center text-sm font-semibold text-orange">
                Buy Bot
              </p>
            </motion.button>
          ))}
        </div>
      </SurfaceCard>

      <Dialog
        open={!!selected && !!selectedVariant}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">
          {selected && selectedVariant && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {selected.name}
                </DialogTitle>
                <DialogDescription>
                  {displayStrategyLabel(selectedVariant)} ·{" "}
                  {formatUsdInteger(selected.price_usd)}
                </DialogDescription>
              </DialogHeader>
              <BotPurchaseFlow
                package={selected}
                variant={selectedVariant}
                depositAddresses={depositAddresses}
                onSubmitted={(payment) => {
                  onPurchaseSubmitted?.(payment);
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
