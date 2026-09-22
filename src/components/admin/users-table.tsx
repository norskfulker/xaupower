"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  accountCount: number;
  totalDeposited: number;
  created_at: string;
};

export function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.email.toLowerCase().includes(needle) ||
        (r.full_name ?? "").toLowerCase().includes(needle)
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-display text-3xl sm:text-4xl">Users</h2>
        <Input
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs border-border bg-white text-ink"
        />
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Accounts</th>
              <th className="px-3 py-2">Total deposited</th>
              <th className="px-3 py-2">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <p className="font-medium text-ink">{r.full_name ?? "—"}</p>
                  <p className="text-xs text-muted-label">{r.email}</p>
                </td>
                <td className="px-3 py-2 tabular">{r.accountCount}</td>
                <td className="px-3 py-2 tabular">{formatUsd(r.totalDeposited)}</td>
                <td className="px-3 py-2 text-ink/60">
                  {format(new Date(r.created_at), "d MMM yyyy")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}