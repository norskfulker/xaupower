"use client";

import { GoldIcon } from "@/components/brand/gold-icon";
import { formatPrice } from "@/lib/format";
import { formatAsOf, isPriceStale, type PriceQuote } from "@/lib/prices";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

const CHART_HEIGHT = 220;
const CHART_WIDTH = 360;
const RANGE_USD = 24;

function buildYLabels(center: number, steps = 7): number[] {
  const half = RANGE_USD / 2;
  const top = center + half;
  const step = RANGE_USD / (steps - 1);
  return Array.from({ length: steps }, (_, i) => top - i * step);
}

function priceToY(price: number, labels: number[]): number {
  const top = labels[0];
  const bottom = labels[labels.length - 1];
  const span = top - bottom || 1;
  const ratio = (top - price) / span;
  return Math.min(CHART_HEIGHT - 8, Math.max(8, ratio * CHART_HEIGHT));
}

export function LandingPriceChart({
  initialQuote,
}: {
  initialQuote?: PriceQuote | null;
}) {
  const initialPrice = initialQuote ? Number(initialQuote.price) : null;
  const [price, setPrice] = useState<number | null>(
    initialPrice != null && Number.isFinite(initialPrice) ? initialPrice : null
  );
  const [fetchedAt, setFetchedAt] = useState<string | null>(
    initialQuote?.fetched_at ?? null
  );

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function applyQuote(quote: PriceQuote) {
      if (quote.pair !== "XAUUSD") return;
      const next = Number(quote.price);
      if (!Number.isFinite(next) || next <= 0) return;
      setPrice(next);
      setFetchedAt(quote.fetched_at);
    }

    async function load() {
      const { data } = await supabase
        .from("price_cache")
        .select("pair, price, change_pct, fetched_at")
        .eq("pair", "XAUUSD")
        .maybeSingle();
      if (cancelled || !data) return;
      applyQuote(data as PriceQuote);
    }

    void load();

    const channel = supabase
      .channel(`landing-chart-${crypto.randomUUID()}`)
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

  const displayPrice = price ?? 2650;
  const labels = useMemo(() => buildYLabels(displayPrice), [displayPrice]);
  const dotY = priceToY(displayPrice, labels);
  const dotX = CHART_WIDTH * 0.8;
  const stale = fetchedAt ? isPriceStale(fetchedAt) : true;
  const asOf = fetchedAt ? formatAsOf(fetchedAt) : null;

  const linePath = useMemo(() => {
    const points = [
      [0, dotY + 40],
      [CHART_WIDTH * 0.15, dotY + 25],
      [CHART_WIDTH * 0.3, dotY - 15],
      [CHART_WIDTH * 0.45, dotY - 30],
      [CHART_WIDTH * 0.55, dotY + 5],
      [CHART_WIDTH * 0.65, dotY + 18],
      [CHART_WIDTH * 0.75, dotY - 8],
      [dotX, dotY],
    ];
    const [first, ...rest] = points;
    let d = `M${first[0]} ${first[1]}`;
    for (let i = 0; i < rest.length - 1; i++) {
      const [x0, y0] = i === 0 ? first : rest[i - 1];
      const [x1, y1] = rest[i];
      const [x2, y2] = rest[i + 1];
      const cx = x1;
      const cy = y1;
      d += ` C ${cx} ${cy}, ${x1} ${y1}, ${x2} ${y2}`;
    }
    return d;
  }, [dotY, dotX]);

  const fillPath = `${linePath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;

  return (
    <div className="w-full rounded-2xl bg-ink p-3 text-white shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40 sm:text-xs sm:tracking-[0.18em]">
            <span className="size-2 shrink-0 rounded-full bg-emerald-400" /> Live
            VPS Engine Feed
          </p>
          <p className="mt-1 flex items-center gap-2">
            <GoldIcon className="size-5 shrink-0" />
            <span className="text-2xl font-black tabular text-gold sm:text-3xl">
              {price == null ? "—" : formatPrice(price, 2)}
            </span>
          </p>
          <p className="mt-1 text-[11px] text-white/40 sm:text-xs">
            XAU/USD · Automated execution target
            {stale && asOf && (
              <span className="block sm:ml-1 sm:inline">· as of {asOf}</span>
            )}
          </p>
        </div>
        <span className="w-fit shrink-0 self-start rounded-full border border-teal/20 bg-teal/15 px-2.5 py-1 text-[10px] font-bold uppercase text-teal sm:text-xs">
          Auto Long
        </span>
      </div>
      <div className="mt-3 flex min-w-0 gap-2 sm:mt-4 sm:gap-3">
        <div className="flex w-9 shrink-0 flex-col justify-between py-1 text-[9px] tabular text-white/30 sm:w-10 sm:text-[10px]">
          {labels.map((label) => (
            <span key={label} className="leading-none">
              {formatPrice(label, 0)}
            </span>
          ))}
        </div>
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="h-36 min-w-0 flex-1 sm:h-52"
          aria-hidden
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 80, 120, 160, 200].map((y) => (
            <line
              key={y}
              x1="0"
              x2={CHART_WIDTH}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}
          <path d={fillPath} fill="url(#goldFill)" />
          <path
            d={linePath}
            fill="none"
            stroke="hsl(var(--gold))"
            strokeWidth="2.5"
          />
          <circle cx={dotX} cy={dotY} r="5" fill="hsl(var(--gold))" />
          <line
            x1={dotX}
            x2={dotX}
            y1={dotY}
            y2={CHART_HEIGHT - 20}
            stroke="hsl(var(--gold))"
            strokeDasharray="3 4"
            opacity="0.7"
          />
        </svg>
      </div>
      <div className="mt-2 flex justify-between pl-9 text-[9px] tabular text-white/30 sm:pl-10 sm:text-[10px]">
        {["08:00", "10:00", "12:00", "14:00", "15:45"].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-2 text-[11px] sm:flex-row sm:items-center sm:justify-between sm:text-xs">
        <span className="text-white/50">Auto-execution latency: 0.4ms</span>
        <span className={cn("font-extrabold tabular text-gold")}>
          {price == null ? "—" : formatPrice(price, 2)}
        </span>
      </div>
    </div>
  );
}
