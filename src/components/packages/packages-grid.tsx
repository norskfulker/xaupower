"use client";

import Link from "next/link";
import { SurfaceCard } from "@/components/ui/surface-card";
import { BOT_PLAN_SPECS, planSpecLines } from "@/lib/bot-plans";
import {
  dailyReturnLabel,
  formatUsdInteger,
  PLAN_ACCESS_TERM,
} from "@/lib/format";
import type { PackageName } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Package } from "@/lib/types";
import { Check } from "lucide-react";

export function PackagesGrid({
  packages,
  ctaHref,
  ctaLabel = "Buy Bot",
}: {
  packages: Package[];
  ctaHref: string;
  ctaLabel?: string;
}) {
  const ordered = [...packages].sort(
    (a, b) => Number(a.price_usd) - Number(b.price_usd)
  );

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-3">
      {ordered.map((pkg) => {
        const planName = pkg.name as PackageName;
        const spec = BOT_PLAN_SPECS[planName];
        const bullets = planSpecLines(planName);

        return (
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
              {formatUsdInteger(spec.minDeposit)}
            </p>
            <p className="mt-2 text-sm font-medium text-muted-label">
              min deposit · {PLAN_ACCESS_TERM}
            </p>
            <p className="mt-1 text-xs font-semibold text-teal">
              {dailyReturnLabel(planName)} daily
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-ink/80">
              {bullets.slice(1).map((line) => (
                <li key={line} className="flex justify-center gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href={ctaHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white hover:bg-orange/90"
              >
                {ctaLabel}
              </Link>
            </div>
          </SurfaceCard>
        );
      })}
    </div>
  );
}
