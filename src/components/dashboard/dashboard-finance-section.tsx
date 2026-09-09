"use client";

import type { Package, PackageVariant } from "@/lib/types";
import Link from "next/link";

const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/xaupowersignals";

export function DashboardFinanceSection({
  hasActivePackage,
}: {
  packages?: Package[];
  variants?: PackageVariant[];
  hasActivePackage: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-card sm:p-7">
      <p className="text-kicker">What to do</p>
      <h2 className="mt-2 text-xl font-black tracking-tight text-ink">
        {hasActivePackage
          ? "Your bot is active"
          : "Two ways to use XAUPower"}
      </h2>
      <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-2 sm:gap-5">
        {hasActivePackage ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                1
              </span>
              <p className="mt-3 font-semibold text-ink">Add funds</p>
              <p className="mt-1 text-sm text-muted-label">
                Top up the bot you want to run.
              </p>
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                2
              </span>
              <p className="mt-3 font-semibold text-ink">Join VIP Signals</p>
              <p className="mt-1 text-sm text-muted-label">
                Telegram VIP membership: about 15–20 signals a day. Public feed
                is normally only 1–2 per day.
              </p>
            </a>
          </>
        ) : (
          <>
            <Link
              href="/dashboard/packages"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                A
              </span>
              <p className="mt-3 font-semibold text-ink">Buy Bot</p>
              <p className="mt-1 text-sm text-muted-label">
                Pick a plan and get your own bot ID.
              </p>
            </Link>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-canvas px-4 py-4 text-left transition hover:bg-orange/10"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
                B
              </span>
              <p className="mt-3 font-semibold text-ink">Telegram VIP Signals</p>
              <p className="mt-1 text-sm text-muted-label">
                Join VIP membership for about 15–20 signals a day — the normal
                feed is only 1–2 per day.
              </p>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
