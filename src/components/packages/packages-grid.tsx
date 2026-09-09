"use client";

import Link from "next/link";
import { SurfaceCard } from "@/components/ui/surface-card";
import {
  formatAccessTerm,
} from "@/lib/package-display";
import { formatUsdInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Package, PackageVariant } from "@/lib/types";

export function PackagesGrid({
  packages,
  ctaHref,
  ctaLabel = "Buy Bot",
}: {
  packages: Package[];
  variants?: PackageVariant[];
  ctaHref: string;
  ctaLabel?: string;
}) {
  const ordered = [...packages].sort(
    (a, b) => Number(a.price_usd) - Number(b.price_usd)
  );

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-3">
      {ordered.map((pkg) => (
          <SurfaceCard
            key={pkg.id}
            className={cn(
              "relative flex h-full min-h-[22rem] flex-col text-center sm:min-h-[24rem]",
              pkg.is_featured && "z-10 ring-1 ring-orange/40 shadow-float md:-rotate-1"
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
              {formatUsdInteger(pkg.price_usd)}
            </p>
            <p className="mt-2 text-sm font-medium text-muted-label">
              min deposit · {formatAccessTerm(pkg)}
            </p>
            <div className="mt-auto pt-6">
              <Link
                href={ctaHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white hover:bg-orange/90"
              >
                {ctaLabel}
              </Link>
            </div>
          </SurfaceCard>
      ))}
    </div>
  );
}
