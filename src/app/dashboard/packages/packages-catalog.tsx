"use client";

import { useRouter } from "next/navigation";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
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
  const ordered = [...packages].sort((a, b) => Number(a.price_usd) - Number(b.price_usd));

  return (
    <div className="overflow-hidden rounded-lg bg-white p-5 text-ink shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Available packages</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-label">
            Bot lot size, bot profit target, and bot drawdown are VPS bot terms —
            not personal capital-sizing advice.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {ordered.map((pkg) => {
          const standard = variants.find(
            (v) => v.package_id === pkg.id && v.risk_tier === "standard"
          );
          return (
            <div
              key={pkg.id}
              className={cn(
                "relative flex flex-col rounded-lg border p-5",
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
            </div>
          );
        })}
      </div>

      <div className="mt-6 border-t border-border pt-6">
        <p className="mb-4 text-sm font-semibold text-ink">
          Choose package and risk term
        </p>
        <PackageVariantPicker
          packages={packages}
          variants={variants}
          onConfirm={(variant) => {
            router.push(`/dashboard/payment?variant=${variant.id}`);
          }}
        />
      </div>
    </div>
  );
}
