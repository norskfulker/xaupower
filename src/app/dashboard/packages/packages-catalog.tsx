"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
import { SurfaceCard } from "@/components/ui/surface-card";
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
      <SurfaceCard padding="lg">
        <p className="text-kicker">Plans</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-ink">Buy Bot</h2>

        <div className="mt-8 grid items-stretch gap-4 sm:gap-6 lg:grid-cols-3">
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
                  "relative flex h-full min-h-[18rem] flex-col rounded-2xl p-6 text-left shadow-card transition hover:shadow-float sm:min-h-[20rem] sm:p-7",
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
                  {formatUsd(pkg.price_usd)}
                </p>
                <p className="mt-2 text-xs text-muted-label">30-day access</p>
                <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
                  {(pkg.features ?? []).slice(0, 3).map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {standard && (
                  <p className="mt-auto pt-5 text-xs text-muted-label">
                    {RISK_LABEL.standard} · lot {standard.max_lot_size}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </SurfaceCard>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-border bg-white text-ink">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription className="text-muted-label">
                  {selected.tagline || "VPS bot plan details and risk terms."}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3">
                <p className="text-metric text-orange">
                  {formatUsd(selected.price_usd)}
                </p>
                <p className="mt-2 text-xs text-muted-label">30-day access</p>
              </div>

              <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
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
