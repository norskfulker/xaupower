"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  packageName: string | null;
  totalDeposited: number;
  available: number;
  pending: number;
  created_at: string;
};

export function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"email" | "deposited" | "balance">("email");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = rows.filter(
      (r) =>
        !needle ||
        r.email.toLowerCase().includes(needle) ||
        (r.full_name ?? "").toLowerCase().includes(needle)
    );
    list = [...list].sort((a, b) => {
      if (sort === "deposited") return b.totalDeposited - a.totalDeposited;
      if (sort === "balance")
        return b.available + b.pending - (a.available + a.pending);
      return a.email.localeCompare(b.email);
    });
    return list;
  }, [rows, q, sort]);

  return (
    <section id="users" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold text-white">Users</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 border-white/20 bg-ink text-white"
          />
          <select
            className="rounded-lg border border-white/20 bg-ink px-2 text-sm text-white"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="email">Sort by email</option>
            <option value="deposited">Sort by deposited</option>
            <option value="balance">Sort by balance</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-white/50">
            <tr>
              <th className="px-3 py-2">Profile</th>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Deposited</th>
              <th className="px-3 py-2">Wallet</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/10">
                <td className="px-3 py-2">
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-white/50">{r.email}</div>
                </td>
                <td className="px-3 py-2">{r.packageName ?? "None"}</td>
                <td className="px-3 py-2 tabular">
                  {formatUsd(r.totalDeposited)}
                </td>
                <td className="px-3 py-2 tabular">
                  {formatUsd(r.available)}{" "}
                  <span className="text-white/40">
                    + {formatUsd(r.pending)} pend
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs",
                      r.packageName
                        ? "bg-teal/20 text-teal"
                        : "bg-white/10 text-white/60"
                    )}
                  >
                    {r.packageName ? "Active" : "Free"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
