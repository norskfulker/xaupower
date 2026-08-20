"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import type { Payment } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => status === "all" || p.status === status);
  }, [payments, status]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Payments</h2>
        <select
          className="rounded-lg border border-white/20 bg-ink px-2 py-1 text-sm text-white"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="pending_review">Pending review</option>
          <option value="confirmed">Confirmed</option>
          <option value="rejected">Rejected</option>
          <option value="waiting">Waiting</option>
          <option value="confirming">Confirming</option>
          <option value="partially_paid">Partially paid</option>
          <option value="failed">Failed</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-white/50">
            <tr>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Currency</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">NOWPayments id</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const ageMs = Date.now() - new Date(p.created_at).getTime();
              const stuck =
                (p.status === "waiting" || p.status === "confirming") &&
                ageMs > 60 * 60 * 1000;
              return (
                <tr
                  key={p.id}
                  className={cn(
                    "border-t border-white/10",
                    stuck && "bg-hotpink/10"
                  )}
                >
                  <td className="px-3 py-2 tabular">{formatUsd(p.amount_usd)}</td>
                  <td className="px-3 py-2">{p.currency}</td>
                  <td className="px-3 py-2 capitalize">
                    {p.status.replace("_", " ")}
                    {stuck && (
                      <span className="ml-2 text-xs text-hotpink">
                        stuck &gt;1h
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-white/60">
                    {new Date(p.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs tabular text-white/50">
                    {p.nowpayments_payment_id ?? "—"}
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
