"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatUsd } from "@/lib/format";
import type { Signal } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function SignalFeed({ initialSignals }: { initialSignals: Signal[] }) {
  const [signals, setSignals] = useState(initialSignals);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("signals-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        (payload) => {
          const row = payload.new as Signal;
          setSignals((prev) => [row, ...prev]);
          setFlashIds((prev) => new Set(prev).add(row.id));
          window.setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              next.delete(row.id);
              return next;
            });
          }, 1500);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "signals" },
        (payload) => {
          const row = payload.new as Signal;
          setSignals((prev) =>
            prev.map((s) => (s.id === row.id ? row : s))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h3 className="text-lg font-bold text-ink">Live signal feed</h3>
        <p className="mt-2 text-sm text-muted-label">
          No signals yet. Activate a package to stay ready when the feed opens.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-lg font-bold text-ink">Live signal feed</h3>
        <p className="text-sm text-muted-label">Read-only shared feed</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
            <tr>
              <th className="px-4 py-3 font-medium">Pair</th>
              <th className="px-4 py-3 font-medium">Direction</th>
              <th className="px-4 py-3 font-medium">Entry</th>
              <th className="px-4 py-3 font-medium">SL</th>
              <th className="px-4 py-3 font-medium">TP</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr
                key={s.id}
                className={cn(
                  "border-t border-border transition-colors duration-[1500ms]",
                  flashIds.has(s.id) && "bg-gold/40"
                )}
              >
                <td className="px-4 py-3 font-semibold">{s.pair}</td>
                <td className="px-4 py-3">
                  <Badge
                    className={cn(
                      s.direction === "long"
                        ? "bg-teal/15 text-teal"
                        : "bg-hotpink/15 text-hotpink"
                    )}
                  >
                    {s.direction}
                  </Badge>
                </td>
                <td className="px-4 py-3 tabular">
                  {formatPrice(s.entry_price, 2)}
                </td>
                <td className="px-4 py-3 tabular">
                  {formatPrice(s.stop_loss, 2)}
                </td>
                <td className="px-4 py-3 tabular">
                  {formatPrice(s.take_profit, 2)}
                </td>
                <td className="px-4 py-3 capitalize">{s.status}</td>
                <td
                  className={cn(
                    "px-4 py-3 tabular font-medium",
                    s.pnl_usd != null &&
                      Number(s.pnl_usd) >= 0 &&
                      "text-teal",
                    s.pnl_usd != null &&
                      Number(s.pnl_usd) < 0 &&
                      "text-hotpink"
                  )}
                >
                  {s.pnl_usd != null ? formatUsd(s.pnl_usd) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
