"use client";

import { formatUsd, ACCOUNT_STATUS_LABEL, RISK_LABEL } from "@/lib/format";
import { format } from "date-fns";

type AccountRow = {
  id: string;
  user_id: string;
  account_code: string;
  name: string;
  risk_tier: "conservative" | "standard" | "aggressive";
  status: "active" | "expired" | "draining";
  available_usd: number;
  pending_usd: number;
  capital_usd: number;
  purchased_at: string;
  expires_at: string | null;
  email: string;
  full_name: string | null;
};

export function AccountsTable({ rows }: { rows: AccountRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-label shadow-card">
        No accounts yet.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-canvas text-xs uppercase text-ink/50">
          <tr>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Risk</th>
            <th className="px-3 py-2">Available</th>
            <th className="px-3 py-2">Pending</th>
            <th className="px-3 py-2">Capital</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Purchased</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-3 py-2">
                <p className="font-display text-base text-ink">{r.name}</p>
                <p className="font-mono text-xs text-muted-label">
                  {r.account_code}
                </p>
              </td>
              <td className="px-3 py-2 text-ink/80">
                <p className="text-sm">{r.full_name ?? "—"}</p>
                <p className="text-xs text-muted-label">{r.email}</p>
              </td>
              <td className="px-3 py-2">{RISK_LABEL[r.risk_tier]}</td>
              <td className="px-3 py-2 tabular">{formatUsd(r.available_usd)}</td>
              <td className="px-3 py-2 tabular">{formatUsd(r.pending_usd)}</td>
              <td className="px-3 py-2 tabular">{formatUsd(r.capital_usd)}</td>
              <td className="px-3 py-2 capitalize">
                {ACCOUNT_STATUS_LABEL[r.status]}
              </td>
              <td className="px-3 py-2 text-ink/60">
                {format(new Date(r.purchased_at), "d MMM yyyy")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}