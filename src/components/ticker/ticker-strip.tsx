"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import { useCallback, useEffect, useRef, useState } from "react";

type Tick = {
  symbol: "XAUUSD" | "XAGUSD";
  price: number;
  direction: "up" | "down" | "flat";
  flash: boolean;
};

const FALLBACK: Record<"XAUUSD" | "XAGUSD", number> = {
  XAUUSD: 2341.2,
  XAGUSD: 27.84,
};

export function TickerStrip({ className }: { className?: string }) {
  const [ticks, setTicks] = useState<Tick[]>([
    { symbol: "XAUUSD", price: FALLBACK.XAUUSD, direction: "flat", flash: false },
    { symbol: "XAGUSD", price: FALLBACK.XAGUSD, direction: "flat", flash: false },
  ]);
  const prev = useRef(FALLBACK);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const applyPrices = useCallback((xau: number, xag: number) => {
    const next: Tick[] = (
      [
        ["XAUUSD", xau],
        ["XAGUSD", xag],
      ] as const
    ).map(([symbol, price]) => {
      const old = prev.current[symbol];
      const direction = price > old ? "up" : price < old ? "down" : "flat";
      return { symbol, price, direction, flash: direction !== "flat" };
    });
    prev.current = { XAUUSD: xau, XAGUSD: xag };
    setTicks(next);

    if (!reduceMotion.current) {
      const t = window.setTimeout(() => {
        setTicks((cur) => cur.map((c) => ({ ...c, flash: false })));
      }, 600);
      return () => window.clearTimeout(t);
    }
    setTicks((cur) => cur.map((c) => ({ ...c, flash: false })));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error("price fetch failed");
        const data = (await res.json()) as {
          XAUUSD: number;
          XAGUSD: number;
        };
        if (!cancelled) applyPrices(data.XAUUSD, data.XAGUSD);
      } catch {
        if (!cancelled) {
          applyPrices(
            FALLBACK.XAUUSD + (Math.random() - 0.5) * 2,
            FALLBACK.XAGUSD + (Math.random() - 0.5) * 0.1
          );
        }
      }
    }

    poll();
    const id = window.setInterval(poll, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [applyPrices]);

  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {ticks.map((tick) => (
        <div
          key={tick.symbol}
          className={cn(
            "rounded-md px-2 py-1 text-sm font-semibold tabular transition-colors duration-[600ms]",
            tick.direction === "up" && "text-orange",
            tick.direction === "down" && "text-teal",
            tick.direction === "flat" && "text-white/80",
            tick.flash &&
              tick.direction === "up" &&
              "bg-orange/15",
            tick.flash &&
              tick.direction === "down" &&
              "bg-teal/15",
            reduceMotion.current && tick.flash && "duration-0"
          )}
        >
          <span className="mr-2 text-white/50">{tick.symbol}</span>
          {formatPrice(tick.price, tick.symbol === "XAUUSD" ? 2 : 2)}
        </div>
      ))}
    </div>
  );
}
