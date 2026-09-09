"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusPill } from "@/components/ui/status-pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import { Button } from "@/components/ui/button";
import { formatUsd, formatUsdInteger } from "@/lib/format";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import type { LedgerTransaction, Payment, UserPackage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronDown, Copy, TrendingUp } from "lucide-react";

type HistoryRow = Pick<
  UserPackage,
  | "id"
  | "status"
  | "purchased_at"
  | "expires_at"
  | "account_code"
  | "available_usd"
  | "variant_snapshot"
  | "package_variants"
> & {
  source?: "package" | "payment";
  amount_usd?: number;
};

function paymentToHistoryRow(payment: Payment): HistoryRow {
  return {
    id: payment.id,
    status: "pending",
    purchased_at: payment.created_at,
    expires_at: null,
    account_code: null,
    available_usd: Number(payment.amount_usd ?? 0),
    amount_usd: Number(payment.amount_usd ?? 0),
    variant_snapshot: payment.variant_snapshot,
    package_variants: payment.package_variants,
    source: "payment",
  };
}

function parseReturnPct(description: string): string | null {
  const match = description.match(/(\d+(?:\.\d+)?)%/);
  return match?.[1] ?? null;
}

export function AccessHistoryCards({
  rows,
  pendingPayments = [],
  profitReturns = [],
}: {
  rows: HistoryRow[];
  pendingPayments?: Payment[];
  profitReturns?: LedgerTransaction[];
}) {
  const packageIds = new Set(rows.map((r) => r.id));
  const extraPending = pendingPayments
    .filter((p) => p.kind === "package")
    .filter((p) =>
      ["pending_review", "waiting", "confirming"].includes(p.status)
    )
    .filter((p) => !p.user_package_id || !packageIds.has(p.user_package_id))
    .map(paymentToHistoryRow);

  const merged = [
    ...extraPending,
    ...rows.map((r) => ({ ...r, source: "package" as const })),
  ].sort((a, b) => {
    const at = a.purchased_at ? new Date(a.purchased_at).getTime() : 0;
    const bt = b.purchased_at ? new Date(b.purchased_at).getTime() : 0;
    return bt - at;
  });

  const profitsByBot = useMemo(() => {
    const map = new Map<string, LedgerTransaction[]>();
    for (const tx of profitReturns) {
      if (tx.type !== "bot_return" || !tx.reference_id) continue;
      const list = map.get(tx.reference_id) ?? [];
      list.push(tx);
      map.set(tx.reference_id, list);
    }
    for (const [, list] of Array.from(map.entries())) {
      list.sort(
        (a: LedgerTransaction, b: LedgerTransaction) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    return map;
  }, [profitReturns]);

  if (merged.length === 0) {
    return null;
  }

  return (
    <SurfaceCard id="access-history" className="flex h-full min-h-[16rem] flex-col">
      <p className="text-kicker">Access history</p>
      <ul className="mt-5 space-y-3">
        {merged.map((row) => {
          const rowTerms = resolveUserPackageTerms(row);
          const label =
            packageDisplayLabel(rowTerms) ??
            rowTerms?.package_name ??
            (row.status === "pending" ? "New bot" : "Bot");
          const planSize = Number(
            rowTerms?.price_usd ?? row.amount_usd ?? row.available_usd ?? 0
          );
          const returns =
            row.source === "package" ? profitsByBot.get(row.id) ?? [] : [];
          const totalProfit = returns.reduce(
            (sum, tx) => sum + Number(tx.amount_usd ?? 0),
            0
          );

          return (
            <li
              key={`${row.source ?? "row"}-${row.id}`}
              className="rounded-xl bg-canvas px-3.5 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-sm text-orange">
                      {row.account_code ?? "ID pending"}
                    </p>
                    {row.account_code && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-7 text-muted-label hover:text-ink"
                        onClick={() => {
                          void navigator.clipboard.writeText(row.account_code!);
                          toast.message("Bot ID copied");
                        }}
                        aria-label={`Copy bot ID ${row.account_code}`}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-semibold text-ink">
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs tabular text-muted-label">
                    {row.status === "pending"
                      ? `Submitted ${
                          row.purchased_at
                            ? format(new Date(row.purchased_at), "d MMM yyyy")
                            : "—"
                        }`
                      : `${
                          row.purchased_at
                            ? format(new Date(row.purchased_at), "d MMM yyyy")
                            : "—"
                        } → ${
                          row.expires_at
                            ? format(new Date(row.expires_at), "d MMM yyyy")
                            : "—"
                        }`}
                    {planSize > 0 ? ` · ${formatUsdInteger(planSize)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusPill status={row.status} />
                  {returns.length > 0 && (
                    <p
                      className={cn(
                        "font-display text-sm tabular",
                        totalProfit >= 0 ? "text-teal" : "text-hotpink"
                      )}
                    >
                      {totalProfit >= 0 ? "+" : ""}
                      {formatUsd(totalProfit)}
                    </p>
                  )}
                </div>
              </div>

              {returns.length > 0 && (
                <BotProfitHistory returns={returns} totalProfit={totalProfit} />
              )}
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}

function BotProfitHistory({
  returns,
  totalProfit,
}: {
  returns: LedgerTransaction[];
  totalProfit: number;
}) {
  const [open, setOpen] = useState(false);
  const preview = returns.slice(0, open ? 14 : 3);

  return (
    <div className="mt-3 border-t border-border/70 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-label">
          <TrendingUp className="size-3.5 text-teal" />
          Profit history · {returns.length} day
          {returns.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink">
          {formatUsd(totalProfit)}
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-label transition",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      <ul className="mt-2 space-y-1.5">
        {preview.map((tx) => {
          const pct = parseReturnPct(tx.description);
          const amount = Number(tx.amount_usd ?? 0);
          return (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white/70 px-2.5 py-2 text-xs"
            >
              <span className="text-muted-label">
                {format(new Date(tx.created_at), "d MMM yyyy")}
                {pct ? ` · ${pct}%` : ""}
              </span>
              <span
                className={cn(
                  "font-display tabular",
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
      {returns.length > 3 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs font-semibold text-orange hover:underline"
        >
          {open ? "Show less" : `Show all ${returns.length} returns`}
        </button>
      )}
    </div>
  );
}
