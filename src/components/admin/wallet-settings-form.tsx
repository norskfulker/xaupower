"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DepositAddress } from "@/lib/types";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";

export function WalletSettingsForm({
  initialAddresses,
}: {
  initialAddresses: DepositAddress[];
}) {
  const [rows, setRows] = useState(initialAddresses);
  const [saving, setSaving] = useState<string | null>(null);

  const hasPlaceholder = rows.some((r) =>
    r.address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX)
  );

  async function save(row: DepositAddress) {
    setSaving(row.id);
    try {
      const res = await fetch("/api/admin/deposit-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          address: row.address,
          isActive: row.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? (data.address as DepositAddress) : r))
      );
      toast.message("Address saved");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Deposit wallets</h1>
        <p className="mt-1 text-sm text-white/60">
          Addresses shown to users in the deposit flow. Replace placeholders
          before accepting real funds.
        </p>
      </div>

      {hasPlaceholder && (
        <div className="rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-gold">
          One or more addresses still use the seeded PLACEHOLDER_ values.
          Replace them with live wallet addresses before go-live.
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((row) => (
          <li
            key={row.id}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <Label className="text-white/80">{row.currency}</Label>
            <Input
              className="mt-2 bg-ink text-white tabular"
              value={row.address}
              onChange={(e) =>
                setRows((prev) =>
                  prev.map((r) =>
                    r.id === row.id ? { ...r, address: e.target.value } : r
                  )
                )
              }
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={row.is_active}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r) =>
                        r.id === row.id
                          ? { ...r, is_active: e.target.checked }
                          : r
                      )
                    )
                  }
                />
                Active
              </label>
              <Button
                className="bg-orange text-white hover:bg-orange/90"
                disabled={saving === row.id}
                onClick={() => save(row)}
              >
                Save
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
