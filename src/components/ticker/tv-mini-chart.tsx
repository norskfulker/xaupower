"use client";

import Script from "next/script";
import { cn } from "@/lib/utils";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tv-mini-chart": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { symbol?: string };
    }
  }
}

export function TvMiniChart({ className }: { className?: string }) {
  return (
    <div className={cn("h-full w-full min-h-[220px]", className)}>
      <Script
        src="https://widgets.tradingview-widget.com/w/en/tv-mini-chart.js"
        type="module"
        strategy="afterInteractive"
      />
      <tv-mini-chart
        symbol="OANDA:XAUUSD"
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </div>
  );
}
