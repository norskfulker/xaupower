"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUsd } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  packageName: string | null;
  totalDeposited: number;
  available: number;
  pending: number;
  profitPips: number;
  created_at: string;
};

export function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"email" | "deposited" | "balance">("email");
  const [pipsDraft, setPipsDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, String(r.profitPips)]))
  );
  const [savingId, setSavingId] = useState<string | null>(null);

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

  async function savePips(userId: string) {
    const value = Number(pipsDraft[userId]);
    if (!Number.isFinite(value)) {
      toast.error("Enter a valid pips number");
      return;
    }
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/profit-pips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, profitPips: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save pips");
        return;
      }
      toast.success("Profit in pips updated");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section id="users" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-kicker">Admin</p>
          <h2 className="mt-1 text-display text-3xl sm:text-4xl">Users</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search name or email"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-56 border-border bg-canvas text-ink"
          />
          <select
            className="h-11 rounded-md border border-border bg-canvas px-3 text-sm text-ink"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
          >
            <option value="email">Sort by email</option>
            <option value="deposited">Sort by deposited</option>
            <option value="balance">Sort by balance</option>
          </select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2.5">Profile</th>
              <th className="px-3 py-2.5">Package</th>
              <th className="px-3 py-2.5">Deposited</th>
              <th className="px-3 py-2.5">Wallet</th>
              <th className="px-3 py-2.5">Profit (pips)</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/50">
                <td className="px-3 py-2.5">
                  <div className="font-medium">{r.full_name || "—"}</div>
                  <div className="text-xs text-ink/50">{r.email}</div>
                </td>
                <td className="px-3 py-2.5">{r.packageName ?? "None"}</td>
                <td className="px-3 py-2.5 tabular">
                  {formatUsd(r.totalDeposited)}
                </td>
                <td className="px-3 py-2.5 tabular">
                  {formatUsd(r.available)}{" "}
                  <span className="text-ink/40">
                    + {formatUsd(r.pending)} pend
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-9 w-24 bg-canvas tabular"
                      value={pipsDraft[r.id] ?? String(r.profitPips)}
                      onChange={(e) =>
                        setPipsDraft((prev) => ({
                          ...prev,
                          [r.id]: e.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingId === r.id}
                      onClick={() => void savePips(r.id)}
                    >
                      {savingId === r.id ? "…" : "Save"}
                    </Button>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-semibold",
                      r.packageName
                        ? "bg-teal/20 text-teal"
                        : "bg-canvas text-muted-label"
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
