"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Settings as SettingsIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVERAGE_PRESETS = [2, 10, 50, 100, 500, 2000];

export function AccountSettingsInline({
  account,
  defaultOpen = false,
}: {
  account: Account;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [leverage, setLeverage] = useState<number>(account.leverage);
  const [executionType, setExecutionType] = useState<"market" | "instant">(
    account.execution_type
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    leverage !== account.leverage || executionType !== account.execution_type;

  const balance =
    Number(account.available_usd ?? 0) + Number(account.pending_usd ?? 0);
  const canDelete = balance === 0;

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("update_account_settings", {
      p_account_id: account.id,
      p_leverage: leverage,
      p_execution_type: executionType,
    });
    setSaving(false);
    if (error || !data) {
      toast.error(
        error?.message?.replace(/^.*: /, "") || "Could not save settings"
      );
      return;
    }
    toast.success("Saved");
    router.refresh();
  }

  async function deleteAccount() {
    if (!canDelete) return;
    if (
      !window.confirm(
        `Delete ${account.name} (${account.account_code})? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_account", {
      p_account_id: account.id,
    });
    setDeleting(false);
    if (error) {
      toast.error(
        error.message.replace(/^.*: /, "") || "Could not delete account"
      );
      return;
    }
    toast.success(`${account.name} deleted`);
    router.refresh();
  }

  return (
    <div className="mt-4 border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-label transition hover:bg-canvas hover:text-ink"
      >
        <span className="inline-flex items-center gap-1.5">
          <SettingsIcon className="size-3.5" />
          Bot settings
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="mt-3 space-y-4 rounded-2xl bg-canvas p-4">
          {/* Leverage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Leverage</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-label">1:</span>
                <input
                  type="number"
                  min={2}
                  max={2000}
                  step={1}
                  value={leverage}
                  onChange={(e) =>
                    setLeverage(
                      Math.max(
                        2,
                        Math.min(2000, Number(e.target.value) || 2)
                      )
                    )
                  }
                  className="h-8 w-20 rounded-lg border border-input bg-card px-2 text-right font-display text-sm tabular text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-label="Leverage value"
                />
              </div>
            </div>
            <input
              type="range"
              min={2}
              max={2000}
              step={1}
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-orange"
              aria-label="Leverage slider"
            />
            <div className="flex flex-wrap gap-1">
              {LEVERAGE_PRESETS.map((v) => {
                const active = leverage === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLeverage(v)}
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-semibold transition",
                      active
                        ? "border-orange bg-orange/10 text-orange"
                        : "border-border bg-card text-ink/70 hover:border-orange/40"
                    )}
                  >
                    1:{v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Execution */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-ink">Execution</span>
            <div className="grid grid-cols-2 gap-2">
              {(["market", "instant"] as const).map((kind) => {
                const active = executionType === kind;
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setExecutionType(kind)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                      active
                        ? "border-orange bg-orange/15 text-orange ring-1 ring-orange"
                        : "border-border bg-card text-ink/70 hover:border-orange/40"
                    )}
                  >
                    <span className="block capitalize">{kind}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => void deleteAccount()}
              disabled={!canDelete || deleting}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold transition",
                canDelete
                  ? "text-hotpink hover:underline"
                  : "cursor-not-allowed text-muted-label/50"
              )}
              title={
                canDelete
                  ? "Delete this account"
                  : "Account balance must be zero to delete"
              }
            >
              <Trash2 className="size-3.5" />
              {deleting ? "Deleting…" : "Delete account"}
            </button>
            <Button
              onClick={() => void save()}
              disabled={!dirty || saving}
              className="h-8 gap-1.5 bg-orange px-3 text-xs text-white hover:bg-orange/90 disabled:bg-muted disabled:text-muted-label"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
