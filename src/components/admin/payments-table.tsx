"use client";

import { useMemo, useState } from "react";
import { formatUsd, PAYMENT_KIND_LABEL } from "@/lib/format";
import { paymentPackageLabel } from "@/lib/package-terms";
import { formatRail } from "@/lib/wallets";
import { cn } from "@/lib/utils";
import type { Payment } from "@/lib/types";

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return payments.filter((p) => status === "all" || p.status === status);
  }, [payments, status]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-ink">Payments</h2>
        <select
          className="rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink"
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
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Package terms</th>
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
                    "border-t border-border",
                    stuck && "bg-hotpink/10"
                  )}
                >
                  <td className="px-3 py-2 tabular">{formatUsd(p.amount_usd)}</td>
                  <td className="px-3 py-2">
                    {PAYMENT_KIND_LABEL[p.kind ?? "package"]}
                  </td>
                  <td className="px-3 py-2 text-ink/70">
                    {paymentPackageLabel(p) ?? "—"}
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
