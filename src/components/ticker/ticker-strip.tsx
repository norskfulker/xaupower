"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import {
  formatAsOf,
  isPriceStale,
  type PriceQuote,
} from "@/lib/prices";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

type Tick = {
  price: number | null;
  fetchedAt: string | null;
  direction: "up" | "down" | "flat";
  flash: boolean;
};

function initialTick(quotes: PriceQuote[]): Tick {
  const q = quotes.find((row) => row.pair === "XAUUSD");
  return {
    price: q ? Number(q.price) : null,
    fetchedAt: q?.fetched_at ?? null,
    direction: "flat",
    flash: false,
  };
}

export function TickerStrip({
  className,
  tone = "dark",
  initialQuotes = [],
}: {
  className?: string;
  tone?: "dark" | "light";
  initialQuotes?: PriceQuote[];
}) {
  const [tick, setTick] = useState<Tick>(() => initialTick(initialQuotes));
  const prev = useRef<number | null>(
    Number(initialQuotes.find((q) => q.pair === "XAUUSD")?.price) || null
  );
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function applyQuote(quote: PriceQuote) {
      if (quote.pair !== "XAUUSD") return;
      const nextPrice = Number(quote.price);
      if (!Number.isFinite(nextPrice) || nextPrice <= 0) return;
      const old = prev.current;
      const direction =
        old != null && nextPrice > old
          ? "up"
          : old != null && nextPrice < old
            ? "down"
            : "flat";
      prev.current = nextPrice;

      setTick({
        price: nextPrice,
        fetchedAt: quote.fetched_at,
        direction,
        flash: direction !== "flat" && !reduceMotion.current,
      });

      if (!reduceMotion.current && direction !== "flat") {
        window.setTimeout(() => {
          setTick((cur) => ({ ...cur, flash: false }));
        }, 600);
      }
    }

    async function load() {
      const { data } = await supabase
        .from("price_cache")
        .select("pair, price, change_pct, fetched_at")
        .eq("pair", "XAUUSD")
        .maybeSingle();
      if (cancelled || !data) return;
      prev.current = Number(data.price);
      applyQuote(data as PriceQuote);
    }

    void load();

    const channel = supabase
      .channel(`price-cache-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "price_cache",
          filter: "pair=eq.XAUUSD",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as PriceQuote | undefined;
          if (row?.pair && row.price != null) applyQuote(row);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const muted = tone === "light" ? "text-muted-label" : "text-white/50";
  const stale = tick.fetchedAt ? isPriceStale(tick.fetchedAt) : true;
  const asOf = tick.fetchedAt ? formatAsOf(tick.fetchedAt) : null;

  return (
    <div className={cn("inline-flex items-center", className)}>
      <div
        className={cn(
          "rounded-md px-2 py-1 text-sm font-semibold tabular transition-colors duration-[600ms]",
          tick.price == null
            ? muted
            : tick.direction === "up"
              ? "text-orange"
              : tick.direction === "down"
                ? "text-teal"
                : tone === "light"
                  ? "text-ink/70"
                  : "text-white/80",
          tick.flash && tick.direction === "up" && "bg-orange/15",
          tick.flash && tick.direction === "down" && "bg-teal/15"
        )}
      >
        <span className={cn("mr-2", muted)}>XAUUSD</span>
        {tick.price == null ? "—" : formatPrice(tick.price, 2)}
        {tick.price != null && stale && asOf && (
          <span className={cn("ml-2 text-[10px] font-medium uppercase", muted)}>
            delayed · as of {asOf}
          </span>
        )}
      </div>
    </div>
  );
}
