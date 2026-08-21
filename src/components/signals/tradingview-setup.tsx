"use client";

import { TRADINGVIEW_CHART_URL } from "@/lib/types";
import { daysRemaining } from "@/lib/format";
import { ArrowUpRight, Check } from "lucide-react";

const STEPS = [
  "Open TradingView and sign in to your account.",
  "Load the XAUUSD (Gold) chart from the link below.",
  "Add the XAUPower pine script from Invite-only scripts, or paste the script we share after your deposit is approved.",
  "Set alerts on the signal plot so your entries match the playbook.",
];

export function TradingViewSetup({
  expiresAt,
}: {
  expiresAt?: string | null;
}) {
  const days = daysRemaining(expiresAt);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-ink">TradingView setup</h3>
        <p className="mt-1 text-sm text-muted-label">
          Your pine script access is active
          {days != null ? ` · ${days} days left` : ""}. Apply it on TradingView
          — this path does not use the VPS bot and has no trading-balance payout.
        </p>
      </div>
      <ol className="space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-3 rounded-lg bg-canvas px-4 py-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
              {i + 1}
            </span>
            <p className="text-sm text-ink">{step}</p>
          </li>
        ))}
      </ol>
      <a
        href={TRADINGVIEW_CHART_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-orange px-4 text-sm font-medium text-white hover:bg-orange/90"
      >
        Open XAUUSD on TradingView
        <ArrowUpRight className="size-4" />
      </a>
      <p className="flex items-center gap-2 text-xs text-muted-label">
        <Check className="size-3.5 text-teal" />
        Chart symbol: OANDA:XAUUSD
      </p>
    </div>
  );
}
