"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { LedgerTransaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function TransactionsTable({
  rows,
}: {
  rows: LedgerTransaction[];
}) {
  const [type, setType] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "amount">("newest");

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      if (type !== "all" && r.type !== type) return false;
      if (!q.trim()) return true;
      return r.description.toLowerCase().includes(q.trim().toLowerCase());
    });
    list = [...list].sort((a, b) => {
      if (sort === "amount")
        return Math.abs(Number(b.amount_usd)) - Math.abs(Number(a.amount_usd));
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sort === "newest" ? db - da : da - db;
    });
    return list;
  }, [rows, type, q, sort]);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-white shadow-sm p-8 text-center">
        <h2 className="text-lg font-bold text-ink">No transactions yet</h2>
        <p className="mt-2 text-sm text-muted-label">
          Deposits, payouts, and package purchases will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Filter description"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-border bg-white text-ink"
        />
        <select
          className="h-10 rounded-lg border border-border bg-white px-2 text-sm text-ink"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="deposit">Deposit</option>
          <option value="payout">Payout</option>
          <option value="package_purchase">Package purchase</option>
          <option value="signal_settlement">Signal settlement</option>
        </select>
        <select
          className="h-10 rounded-lg border border-border bg-white px-2 text-sm text-ink"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount">Largest amount</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const amount = Number(r.amount_usd);
              const positive = amount >= 0;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-label">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-3 text-ink">{r.description}</td>
                  <td
                    className={cn(
                      "px-4 py-3 font-semibold tabular",
                      positive ? "text-teal" : "text-hotpink"
                    )}
                  >
                    {positive ? "+" : ""}
                    {formatUsd(amount)}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-label">
                    {r.status_at_time.replace("_", " ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: TransactionType }) {
  return (
    <Badge className="bg-canvas capitalize text-ink">
      {type.replace("_", " ")}
    </Badge>
  );
}
