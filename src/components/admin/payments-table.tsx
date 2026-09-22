"use client";

import { useMemo, useState } from "react";
import { formatUsd, PAYMENT_KIND_LABEL } from "@/lib/format";
import { formatRail } from "@/lib/wallets";
import { cn } from "@/lib/utils";
import type { Payment } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => status === "all" || p.status === status);
  }, [payments, status]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-display text-3xl sm:text-4xl">Payments</h2>
        </div>
        <div className="w-52">
          <Select value={status} onValueChange={(value) => value && setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_review">Pending review</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Currency</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Tx hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ageMs = Date.now() - new Date(p.created_at).getTime();
              const stuck =
                p.status === "pending_review" && ageMs > 60 * 60 * 1000;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-t border-border",
                    stuck && "bg-hotpink/10"
                  )}
                >
                  <td className="px-3 py-2 tabular">{formatUsd(p.amount_usd)}</td>
                  <td className="px-3 py-2">{PAYMENT_KIND_LABEL[p.kind]}</td>
                  <td className="px-3 py-2 text-ink/70">
                    {p.profiles?.email ?? "—"}
                  </td>
                  <td className="px-3 py-2">{formatRail(p.currency)}</td>
                  <td className="px-3 py-2 capitalize">
                    {p.status.replace("_", " ")}
                    {stuck && (
                      <span className="ml-2 text-xs text-hotpink">
                        stuck &gt;1h
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink/60">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs tabular text-ink/50">
                    {p.tx_hash ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}