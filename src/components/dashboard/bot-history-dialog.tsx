"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatUsd } from "@/lib/format";
import type { LedgerTransaction } from "@/lib/types";
import { cn } from "@/lib/utils";

export function parseReturnPct(description: string): string | null {
  const match = description.match(/(-?\d+(?:\.\d+)?)%/);
  return match?.[1] ?? null;
}

export function BotHistoryDialog({
  accountCode,
  planLabel,
  returns,
}: {
  accountCode: string | null;
  planLabel: string;
  returns: LedgerTransaction[];
}) {
  const [open, setOpen] = useState(false);
  const totalProfit = useMemo(
    () => returns.reduce((sum, tx) => sum + Number(tx.amount_usd ?? 0), 0),
    [returns]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-label transition hover:bg-muted hover:text-ink"
        aria-label={`Open history for ${accountCode ?? planLabel}`}
      >
        <History className="size-4" />
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bot history</DialogTitle>
          <DialogDescription>
            {accountCode ?? "Bot"} · {planLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-canvas px-4 py-3">
          <p className="text-kicker">Total P&amp;L</p>
          <p
            className={cn(
              "mt-1 font-display text-2xl tabular",
              totalProfit >= 0 ? "text-teal" : "text-hotpink"
            )}
          >
            {totalProfit >= 0 ? "+" : ""}
            {formatUsd(totalProfit)}
          </p>
          <p className="mt-1 text-xs text-muted-label">
            {returns.length} day{returns.length === 1 ? "" : "s"} recorded
          </p>
        </div>

        {returns.length === 0 ? (
          <p className="text-sm text-muted-label">
            No daily returns yet for this bot.
          </p>
        ) : (
          <ul className="space-y-2">
            {returns.map((tx) => {
              const pct = parseReturnPct(tx.description);
              const amount = Number(tx.amount_usd ?? 0);
              const pctNum = pct != null ? Number(pct) : null;
              return (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold tabular text-ink">
                      {format(new Date(tx.created_at), "d MMM yyyy")}
                    </p>
                    {pct != null && (
                      <p className="mt-0.5 text-xs text-muted-label">
                        Daily P&amp;L{" "}
                        {pctNum != null && pctNum > 0 ? "+" : ""}
                        {pct}%
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-display tabular",
                      amount >= 0 ? "text-teal" : "text-hotpink"
                    )}
                  >
                    {amount >= 0 ? "+" : ""}
                    {formatUsd(amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
