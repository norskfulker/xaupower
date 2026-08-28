"use client";

import { useState } from "react";
import { BotPurchaseFlow } from "@/components/packages/bot-purchase-flow";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Button } from "@/components/ui/button";
import {
  BOT_PLAN_SPECS,
  getVariantForPackage,
  planSpecLines,
} from "@/lib/bot-plans";
import {
  dailyReturnLabel,
  formatUsdInteger,
  PLAN_ACCESS_TERM,
} from "@/lib/format";
import type {
  DepositAddress,
  Package,
  PackageName,
  PackageVariant,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

export function PackagesCatalog({
  packages,
  variants,
  depositAddresses,
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
}) {
  const ordered = [...packages].sort(
    (a, b) => Number(a.price_usd) - Number(b.price_usd)
  );
  const [selected, setSelected] = useState<Package | null>(null);

  const selectedVariant =
    selected
      ? getVariantForPackage(
          selected.name as PackageName,
          selected.id,
          variants
        )
      : null;

  function openPackage(pkg: Package) {
    setSelected(pkg);
  }

  function closePackage() {
    setSelected(null);
  }

  function handleCardClick(pkg: Package) {
    if (selected?.id === pkg.id) {
      closePackage();
    } else {
      openPackage(pkg);
    }
  }

  return (
    <SurfaceCard padding="lg">
      <p className="text-kicker">Plans</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">Buy Bot</h2>
      <p className="mt-2 text-sm text-muted-label">
        {PLAN_ACCESS_TERM} access · returns credited daily at 03:00 UTC · tap a
        plan to buy
      </p>

      <div className="mt-8 grid items-stretch gap-4 sm:gap-6 lg:grid-cols-3">
        {ordered.map((pkg) => {
          const isSelected = selected?.id === pkg.id;
          const planName = pkg.name as PackageName;
          const spec = BOT_PLAN_SPECS[planName];
          const bullets = planSpecLines(planName);

          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleCardClick(pkg)}
              className={cn(
                "relative flex h-full min-h-[18rem] flex-col rounded-2xl p-6 text-left shadow-card transition sm:p-7",
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange",
                pkg.is_featured
                  ? "bg-orange/10 ring-1 ring-orange/30"
                  : "bg-canvas",
                isSelected && "ring-2 ring-orange"
              )}
            >
              {pkg.is_featured && (
                <span className="absolute -top-2.5 left-4 rounded-xl bg-orange px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most chosen
                </span>
              )}
              <p className="text-kicker text-orange">{pkg.name}</p>
              <p className="text-metric mt-4 text-ink">
                {formatUsdInteger(spec.minDeposit)}
              </p>
              <p className="mt-2 text-xs text-muted-label">
                {PLAN_ACCESS_TERM} · {dailyReturnLabel(planName)} · 03:00 UTC
              </p>
              {pkg.tagline && (
                <p className="mt-3 text-sm leading-relaxed text-muted-label">
                  {pkg.tagline}
                </p>
              )}
              <ul className="mt-4 space-y-2 text-sm text-ink/80">
                {bullets.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-auto pt-5 text-center text-sm font-semibold text-orange">
                {isSelected ? "Close plan" : "Buy Bot"}
              </p>
            </button>
          );
        })}
      </div>

      {selected && selectedVariant && (
        <SurfaceCard padding="lg" className="mt-6 ring-1 ring-orange/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-kicker text-orange">{selected.name}</p>
              <h3 className="mt-1 text-xl font-bold text-ink">
                {BOT_PLAN_SPECS[selected.name as PackageName].strategy} strategy ·
                Activate Now
              </h3>
              <p className="mt-2 text-sm text-muted-label">
                Min deposit {formatUsdInteger(BOT_PLAN_SPECS[selected.name as PackageName].minDeposit)} ·
                max {formatUsdInteger(10_000_000)} per payment
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-label hover:text-ink"
              onClick={closePackage}
              aria-label="Close purchase card"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="mt-6">
            <BotPurchaseFlow
              package={selected}
              variant={selectedVariant}
              depositAddresses={depositAddresses}
            />
          </div>
        </SurfaceCard>
      )}
    </SurfaceCard>
  );
}
