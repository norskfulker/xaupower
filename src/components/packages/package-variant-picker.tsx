"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatUsd,
  formatUsdInteger,
  PLAN_ACCESS_TERM,
  RISK_LABEL,
  WEEKLY_PROFIT_PCT,
} from "@/lib/format";
import type { Package, PackageVariant, RiskTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TIERS: RiskTier[] = ["conservative", "standard", "aggressive"];

export function PackageVariantPicker({
  packages,
  variants,
  selectedId,
  onSelect,
  onConfirm,
  highlightTerm = false,
}: {
  packages: Package[];
  variants: PackageVariant[];
  selectedId?: string | null;
  onSelect?: (variant: PackageVariant) => void;
  onConfirm?: (variant: PackageVariant) => void;
  highlightTerm?: boolean;
}) {
  const initial =
    variants.find((v) => v.id === selectedId) ??
    variants.find((v) => {
      const pkg = packages.find((p) => p.id === v.package_id);
      return pkg?.is_featured && v.risk_tier === "standard";
    }) ??
    variants[0] ??
    null;

  const [packageId, setPackageId] = useState(
    initial?.package_id ?? packages[0]?.id ?? ""
  );
  const [tierIndex, setTierIndex] = useState(() => {
    const idx = TIERS.indexOf(initial?.risk_tier ?? "standard");
    return idx >= 0 ? idx : 1;
  });

  useEffect(() => {
    const current =
      variants.find((v) => v.id === selectedId) ??
      variants.find((v) => {
        const pkg = packages.find((p) => p.id === v.package_id);
        return pkg?.is_featured && v.risk_tier === "standard";
      }) ??
      variants[0];
    if (!current) return;
    setPackageId(current.package_id);
    const idx = TIERS.indexOf(current.risk_tier);
    setTierIndex(idx >= 0 ? idx : 1);
  }, [selectedId, variants, packages]);

  const selectedPkg = packages.find((p) => p.id === packageId) ?? packages[0];
  const tier = TIERS[tierIndex] ?? "standard";
  const selected = useMemo(
    () =>
      variants.find(
        (v) => v.package_id === selectedPkg?.id && v.risk_tier === tier
      ) ?? null,
    [variants, selectedPkg?.id, tier]
  );

  useEffect(() => {
    if (selected) onSelect?.(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the chosen variant id changes
  }, [selected?.id]);

  const price = Number(selectedPkg?.price_usd ?? selected?.price_usd ?? 0);

  function confirm() {
    if (!selected) return;
    onSelect?.(selected);
    onConfirm?.(selected);
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {packages.map((pkg) => {
          const active = pkg.id === selectedPkg?.id;
          return (
            <button
              key={pkg.id}
              type="button"
              onClick={() => setPackageId(pkg.id)}
              className={cn(
                "rounded-2xl px-3 py-4 text-left transition",
                active
                  ? "bg-orange/10 text-ink ring-1 ring-orange"
                  : "bg-canvas text-ink/80 hover:bg-orange/10",
                pkg.is_featured && !active && "ring-1 ring-orange/40"
              )}
            >
              <span className="block text-sm font-semibold">{pkg.name}</span>
              <span className="mt-1 block text-lg font-extrabold tabular">
                {formatUsdInteger(pkg.price_usd)}
              </span>
              <span
                className={cn(
                  "mt-1 block text-xs",
                  active ? "text-ink/70" : "text-muted-label"
                )}
              >
                {PLAN_ACCESS_TERM}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-6 rounded-2xl bg-canvas p-5",
          highlightTerm && "ring-1 ring-orange/40"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Risk term</p>
          <p className="text-sm font-bold text-orange">{RISK_LABEL[tier]}</p>
        </div>
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={tierIndex}
          onChange={(e) => setTierIndex(Number(e.target.value))}
          className="mt-4 w-full accent-orange"
          aria-label="Risk term"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-label">
          <span>Nominal</span>
          <span>Standard</span>
          <span>Aggressive</span>
        </div>
      </div>

      {selected && (
        <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-3 sm:gap-5">
          <Meta label="Bot lot size" value={String(selected.max_lot_size)} />
          <Meta
            label="Bot drawdown"
            value={`${selected.max_drawdown_pct}%`}
            hint="Bot drawdown band"
          />
          <Meta
            label="Bot profit target"
            value={`${WEEKLY_PROFIT_PCT[tier]}%`}
            hint="Bot profit target / week"
          />
        </div>
      )}

      {onConfirm && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-label">
            Amount due{" "}
            <span className="font-extrabold tabular text-orange">
              {formatUsd(price)}
            </span>
          </p>
          <Button
            className="bg-orange text-white hover:bg-orange/90"
            disabled={!selected}
            onClick={confirm}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

function Meta({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex min-h-[6.5rem] flex-col rounded-2xl bg-canvas p-4 sm:p-5">
      <p className="text-kicker">{label}</p>
      <p className="mt-3 text-2xl font-black tabular text-orange sm:text-3xl">{value}</p>
      {hint && <p className="mt-auto pt-2 text-xs text-muted-label">{hint}</p>}
    </div>
  );
}
