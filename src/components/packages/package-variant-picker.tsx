"use client";

import { useMemo } from "react";
import { formatUsd } from "@/lib/format";
import type { Package, PackageVariant, RiskTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const TIERS: RiskTier[] = ["conservative", "standard", "aggressive"];

function tierLabel(t: RiskTier) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function PackageVariantPicker({
  packages,
  variants,
  selectedId,
  onSelect,
  onBuy,
}: {
  packages: Package[];
  variants: PackageVariant[];
  selectedId?: string | null;
  onSelect: (variant: PackageVariant) => void;
  onBuy?: (variant: PackageVariant) => void;
}) {
  const byKey = useMemo(() => {
    const map = new Map<string, PackageVariant>();
    for (const v of variants) {
      map.set(`${v.package_id}:${v.risk_tier}`, v);
    }
    return map;
  }, [variants]);

  const selected =
    variants.find((v) => v.id === selectedId) ??
    variants.find((v) => {
      const pkg = packages.find((p) => p.id === v.package_id);
      return pkg?.is_featured && v.risk_tier === "standard";
    }) ??
    variants[0] ??
    null;

  const selectedPkg = packages.find((p) => p.id === selected?.package_id);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-label">
              <th className="px-3 py-2 font-medium">Package</th>
              {TIERS.map((t) => (
                <th key={t} className="px-3 py-2 font-medium">
                  {tierLabel(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-t border-border">
                <td className="px-3 py-3 font-semibold text-ink">{pkg.name}</td>
                {TIERS.map((tier) => {
                  const v = byKey.get(`${pkg.id}:${tier}`);
                  if (!v) {
                    return (
                      <td key={tier} className="px-3 py-3 text-muted-label">
                        —
                      </td>
                    );
                  }
                  const active = selected?.id === v.id;
                  return (
                    <td key={tier} className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onSelect(v)}
                        className={cn(
                          "w-full rounded-xl px-3 py-3 text-left transition",
                          active
                            ? "bg-ink text-white"
                            : "bg-canvas hover:bg-orange/10",
                          pkg.is_featured &&
                            tier === "standard" &&
                            !active &&
                            "ring-2 ring-orange"
                        )}
                      >
                        <span className="block text-lg font-extrabold tabular">
                          {formatUsd(v.price_usd)}
                        </span>
                        <span
                          className={cn(
                            "mt-1 block text-xs",
                            active ? "text-white/70" : "text-muted-label"
                          )}
                        >
                          Max lot {v.max_lot_size}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && selectedPkg && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-ink">
                {selectedPkg.name} · {tierLabel(selected.risk_tier)}
              </h3>
              <p className="mt-1 text-sm text-muted-label">{selectedPkg.tagline}</p>
              <p className="mt-3 text-3xl font-extrabold tabular text-ink">
                {formatUsd(selected.price_usd)}
                <span className="text-sm font-medium text-muted-label">
                  {" "}
                  / 30 days
                </span>
              </p>
            </div>
            {onBuy && (
              <Button
                className="bg-orange text-white hover:bg-orange/90"
                onClick={() => onBuy(selected)}
              >
                Buy this plan
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Meta
              label="Max lot size"
              value={String(selected.max_lot_size)}
              hint="Bot position size cap at this tier"
            />
            <Meta
              label="Bot profit target"
              value={`${selected.profit_target_pct}%`}
              hint="What the bot targets per move — not a user return"
            />
            <Meta
              label="Bot max drawdown band"
              value={`${selected.max_drawdown_pct}%`}
              hint="Risk band the bot allows at this tier"
            />
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-ink">Bot roadmap</h4>
            <ol className="mt-3 space-y-2">
              {(selected.roadmap ?? [])
                .slice()
                .sort((a, b) => a.step - b.step)
                .map((step) => (
                  <li
                    key={step.step}
                    className="flex gap-3 rounded-lg bg-canvas px-3 py-2 text-sm text-ink/90"
                  >
                    <span className="font-bold text-orange tabular">
                      {step.step}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
            </ol>
          </div>
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
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-canvas p-4">
      <p className="text-xs uppercase tracking-wide text-muted-label">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted-label">{hint}</p>
    </div>
  );
}
