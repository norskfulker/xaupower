"use client";

import { formatUsd } from "@/lib/format";
import { SIGNAL_PRICE_USD } from "@/lib/types";
import type { Package, PackageVariant } from "@/lib/types";
import Link from "next/link";

export function DashboardFinanceSection({
  hasActivePackage,
}: {
  packages?: Package[];
  variants?: PackageVariant[];
  hasActivePackage: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs uppercase tracking-wide text-muted-label">
        What to do
      </p>
      <h2 className="mt-1 text-xl font-bold text-ink">
        {hasActivePackage
          ? "VPS bot is active — add trading balance"
          : "Two ways to use XAUPower"}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {hasActivePackage ? (
          <>
            <Link
              href="/dashboard/balance"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                1
              </span>
              <p className="mt-3 font-semibold text-ink">Add bot trading balance</p>
              <p className="mt-1 text-sm text-muted-label">
                Deposit capital the VPS bot trades with. Withdraw that balance
                from Payout after admin approval.
              </p>
            </Link>
            <Link
              href="/dashboard/signals-setup"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                2
              </span>
              <p className="mt-3 font-semibold text-ink">TradingView pine script</p>
              <p className="mt-1 text-sm text-muted-label">
                Optional: buy standalone signals and apply the pine script
                yourself. This path has no VPS and no trading-balance payout.
              </p>
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/payment"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                A
              </span>
              <p className="mt-3 font-semibold text-ink">Buy the VPS bot</p>
              <p className="mt-1 text-sm text-muted-label">
                We set up the VPS. Then you add trading balance here and the bot
                takes XAUUSD trades with that capital.
              </p>
            </Link>
            <Link
              href="/dashboard/signals-setup"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                B
              </span>
              <p className="mt-3 font-semibold text-ink">Buy pine script only</p>
              <p className="mt-1 text-sm text-muted-label">
                {formatUsd(SIGNAL_PRICE_USD)} for 30 days — get the TradingView
                pine script and apply it yourself. No VPS bot and no payout of
                trading capital.
              </p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
