"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";
import { CopyButton } from "@/components/ui/copy-button";
import { formatUsd, PAYMENT_KIND_LABEL } from "@/lib/format";
import { format } from "date-fns";
import type {
  Account,
  LedgerTransaction,
  Payment,
  Payout,
  Transfer,
} from "@/lib/types";

type RowKind = "payment" | "payout" | "transfer" | "daily_return";

type Row = {
  id: string;
  kind: RowKind;
  amount: number;
  at: string;
  status: string;
  accountCode: string;
  description: string;
};

export function AccessHistoryList({
  accounts,
  payments,
  payouts,
  transfers,
  transactions,
}: {
  accounts: Account[];
  payments: Payment[];
  payouts: Payout[];
  transfers: Transfer[];
  transactions: LedgerTransaction[];
}) {
  const rows = buildRows(accounts, payments, payouts, transfers, transactions);

  if (rows.length === 0) {
    return (
      <SurfaceCard className="py-8 text-center">
        <p className="text-sm text-muted-label">
          No transactions yet. Deposit to an account to get started.
        </p>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <h2 className="font-display text-lg text-ink">Activity</h2>
      <ul className="mt-4 space-y-2">
        {rows.slice(0, 10).map((row) => (
          <HistoryRow key={row.id} row={row} />
        ))}
      </ul>
      {rows.length > 10 && (
        <a
          href="/dashboard/transactions"
          className="mt-4 inline-flex text-sm font-semibold text-orange hover:underline"
        >
          See all activity →
        </a>
      )}
    </SurfaceCard>
  );
}

function HistoryRow({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const sign = row.kind === "payout" || row.kind === "transfer" && Number(row.amount) < 0 ? -1 : 1;
  const isNegative = sign < 0;
  const tone = isNegative ? "text-hotpink" : "text-teal";

  return (
    <li className="rounded-xl bg-canvas px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">
            {row.description}
          </p>
          <p className="mt-0.5 text-xs text-muted-label">
            {row.accountCode} · {format(new Date(row.at), "d MMM yyyy HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className={cn(tone, "font-display tabular text-sm")}>
            {isNegative ? "−" : "+"}
            {formatUsd(Math.abs(row.amount))}
          </p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Hide details" : "Show details"}
            className="text-muted-label hover:text-ink"
          >
            <ChevronDown
              className={cn("size-4 transition", open && "rotate-180")}
            />
          </button>
        </div>
      </div>
      {open && (
        <div className="mt-3 border-t border-border/70 pt-3 text-xs text-muted-label">
          <p>
            Status:{" "}
            <span className="font-semibold capitalize text-ink">
              {row.status}
            </span>
          </p>
          <CopyButton
            value={row.id}
            label={`Copy reference ${row.id.slice(0, 8)}`}
            variant="button"
          />
        </div>
      )}
    </li>
  );
}

function buildRows(
  accounts: Account[],
  payments: Payment[],
  payouts: Payout[],
  transfers: Transfer[],
  transactions: LedgerTransaction[]
): Row[] {
  const acctMap = new Map(accounts.map((a) => [a.id, a]));
  function code(accountId: string | null | undefined): string {
    if (!accountId) return "—";
    return acctMap.get(accountId)?.account_code ?? "—";
  }

  const paymentRows: Row[] = payments.map((p) => ({
    id: p.id,
    kind: "payment",
    amount: Number(p.amount_usd ?? 0),
    at: p.created_at,
    status: p.status,
    accountCode: code(p.account_id),
    description: `${PAYMENT_KIND_LABEL[p.kind]} via ${p.currency}`,
  }));

  const payoutRows: Row[] = payouts.map((p) => ({
    id: p.id,
    kind: "payout",
    amount: -Number(p.amount_usd ?? 0),
    at: p.requested_at,
    status: p.status,
    accountCode: code(p.account_id),
    description: `Withdrawal via ${p.currency}`,
  }));

  const transferRows: Row[] = transfers.map((t) => {
    return {
      id: t.id,
      kind: "transfer",
      amount: -Number(t.amount_usd ?? 0),
      at: t.created_at,
      status: t.status,
      accountCode: code(t.from_account_id),
      description: `Transfer to user (${t.status})`,
    };
  });

  const dailyRows: Row[] = transactions
    .filter((t) => t.type === "daily_return")
    .map((t) => ({
      id: t.id,
      kind: "daily_return",
      amount: Number(t.amount_usd ?? 0),
      at: t.created_at,
      status: "credited",
      accountCode: code(t.account_id),
      description: "Daily return",
    }));

  return [...paymentRows, ...payoutRows, ...transferRows, ...dailyRows].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );
}

function cn(...inputs: Array<string | undefined | false>): string {
  return inputs.filter(Boolean).join(" ");
}
