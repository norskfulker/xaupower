"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { LedgerTransaction, TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <div className="rounded-2xl bg-card p-8 text-center shadow-card sm:p-10">
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
        <div className="w-48">
          <Select value={type} onValueChange={(value) => value && setType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="deposit">Deposit</SelectItem>
              <SelectItem value="payout">Payout</SelectItem>
              <SelectItem value="package_purchase">Package purchase</SelectItem>
              <SelectItem value="signal_settlement">Signal settlement</SelectItem>
              <SelectItem value="bot_return">Bot return</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select
            value={sort}
            onValueChange={(value) =>
              value && setSort(value as typeof sort)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="amount">Largest amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
            <tr>
              <th className="px-4 py-3.5 font-medium">Date</th>
              <th className="px-4 py-3.5 font-medium">Type</th>
              <th className="px-4 py-3.5 font-medium">Description</th>
              <th className="px-4 py-3.5 font-medium">Amount</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const amount = Number(r.amount_usd);
              const positive = amount >= 0;
              return (
                <tr key={r.id} className="border-t border-border/50">
                  <td className="px-4 py-3.5 text-muted-label">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <TypeBadge type={r.type} />
                  </td>
                  <td className="px-4 py-3.5 text-ink">{r.description}</td>
                  <td
                    className={cn(
                      "px-4 py-3.5 font-semibold tabular",
                      positive ? "text-teal" : "text-hotpink"
                    )}
                  >
                    {positive ? "+" : ""}
                    {formatUsd(amount)}
                  </td>
                  <td className="px-4 py-3.5 capitalize text-muted-label">
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
