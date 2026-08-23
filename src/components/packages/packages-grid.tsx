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
    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-3">
      {packages.map((pkg) => (
        <div
          key={pkg.id}
          className={cn(
            "relative flex h-full min-h-[20rem] flex-col rounded-2xl bg-white p-6 text-center shadow-card sm:min-h-[22rem] sm:p-7",
            pkg.is_featured &&
              "z-10 ring-1 ring-orange/40 shadow-float md:-rotate-1"
          )}
        >
          {pkg.is_featured && (
            <span className="absolute -top-3 left-4 rounded-xl bg-orange px-3 py-0.5 text-xs font-semibold text-white">
              Most chosen
            </span>
          )}
          <h3 className="text-xl font-bold leading-tight text-ink">{pkg.name}</h3>
          {pkg.tagline && (
            <p className="mt-2 text-sm leading-snug text-muted-label">
              {pkg.tagline}
            </p>
          )}
          <p className="text-metric mt-5 text-ink">
            {formatUsd(pkg.price_usd)}
          </p>
          <p className="mt-2 text-sm font-medium text-muted-label">/ 30 days</p>
          <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
            {(pkg.features ?? []).map((f) => (
              <li key={f} className="flex justify-center gap-2">
                <span className="text-teal">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6">
            {onBuy ? (
              <Button
                className="w-full bg-orange text-white hover:bg-orange/90"
                onClick={() => onBuy(pkg)}
              >
                Buy package
              </Button>
            ) : (
              <Link
                href={ctaHref ?? `/dashboard/payment?package=${pkg.id}`}
                className={cn(
                  "inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white hover:bg-orange/90"
                )}
              >
                {ctaLabel}
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
