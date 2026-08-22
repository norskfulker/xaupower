"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatUsd, RISK_LABEL } from "@/lib/format";
import type { Package, PackageVariant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function PackagesCatalog({
  packages,
  variants,
}: {
  packages: Package[];
  variants: PackageVariant[];
}) {
  const router = useRouter();
  const ordered = [...packages].sort(
    (a, b) => Number(a.price_usd) - Number(b.price_usd)
  );
  const [selected, setSelected] = useState<Package | null>(null);

  const selectedVariants = selected
    ? variants.filter((v) => v.package_id === selected.id)
    : [];

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white p-5 text-ink shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-ink">Buy Bot</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-label">
            Choose a VPS bot plan. Tap a plan to view terms and continue to
            checkout.
          </p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {ordered.map((pkg) => {
            const standard = variants.find(
              (v) => v.package_id === pkg.id && v.risk_tier === "standard"
            );
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelected(pkg)}
                className={cn(
                  "relative flex flex-col rounded-lg border p-5 text-left transition hover:border-orange/50 hover:bg-orange/5",
                  pkg.is_featured
                    ? "border-orange bg-orange/10"
                    : "border-border bg-canvas"
                )}
              >
                {pkg.is_featured && (
                  <span className="absolute -top-2.5 left-4 rounded-lg bg-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Most chosen
                  </span>
                )}
                <p className="text-sm font-semibold text-orange">{pkg.name}</p>
                <p className="mt-2 text-3xl font-extrabold tabular text-ink">
                  {formatUsd(pkg.price_usd)}
                </p>
                <p className="text-xs text-muted-label">30-day access</p>
                <p className="mt-3 text-sm text-ink/70">{pkg.tagline}</p>
                <ul className="mt-4 space-y-2 text-sm text-ink/80">
                  {(pkg.features ?? []).slice(0, 3).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {standard && (
                  <p className="mt-4 text-xs text-muted-label">
                    Standard term · {RISK_LABEL.standard} · bot lot{" "}
                    {standard.max_lot_size}
                  </p>
                )}
                <p className="mt-4 text-xs font-semibold text-orange">
                  View details →
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-white p-6 text-ink sm:max-w-lg sm:rounded-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-ink">
                  {selected.name}
                </DialogTitle>
                <DialogDescription className="text-muted-label">
                  {selected.tagline || "VPS bot plan details and risk terms."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2">
                <p className="text-3xl font-extrabold tabular text-orange">
                  {formatUsd(selected.price_usd)}
                </p>
                <p className="text-xs text-muted-label">30-day access</p>
              </div>

              <ul className="mt-4 space-y-2 text-sm text-ink/80">
                {(selected.features ?? []).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-4 text-sm font-semibold text-ink">
                  Choose risk term
                </p>
                <PackageVariantPicker
                  packages={[selected]}
                  variants={selectedVariants}
                  onConfirm={(variant) => {
                    setSelected(null);
                    router.push(`/dashboard/payment?variant=${variant.id}`);
                  }}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
