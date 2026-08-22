"use client";

import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Package } from "@/lib/types";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function PackagesGrid({
  packages,
  onBuy,
  ctaHref,
  ctaLabel = "Buy package",
}: {
  packages: Package[];
  onBuy?: (pkg: Package) => void;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={cn(
            "relative w-full rounded-2xl bg-white p-5 text-center shadow-sm sm:p-6",
            pkg.is_featured &&
              "z-10 border-2 border-orange shadow-md md:-rotate-1"
          )}
        >
          {pkg.is_featured && (
            <span className="absolute -top-3 left-4 rounded-full bg-orange px-3 py-0.5 text-xs font-semibold text-white">
              Most chosen
            </span>
          )}
          <h3 className="text-xl font-bold text-ink">{pkg.name}</h3>
          <p className="mt-1 text-sm text-muted-label">{pkg.tagline}</p>
          <p className="mt-4 text-3xl font-extrabold tabular text-ink">
            {formatUsd(pkg.price_usd)}
            <span className="text-sm font-medium text-muted-label"> / 30 days</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink/80">
            {(pkg.features ?? []).map((f) => (
              <li key={f} className="flex justify-center gap-2">
                <span className="text-teal">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {onBuy ? (
            <Button
              className="mt-6 w-full bg-orange text-white hover:bg-orange/90"
              onClick={() => onBuy(pkg)}
            >
              Buy package
            </Button>
          ) : (
            <Link
              href={ctaHref ?? `/dashboard/payment?package=${pkg.id}`}
              className={cn(
                "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-orange px-4 text-sm font-medium text-white hover:bg-orange/90"
              )}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
