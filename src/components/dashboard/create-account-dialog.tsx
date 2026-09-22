"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Account, RiskTier } from "@/lib/types";
import { DAILY_RETURN_PCT, RISK_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const TIERS: { value: RiskTier; body: string }[] = [
  { value: "conservative", body: "Steady, lower drawdown." },
  { value: "standard", body: "Balanced daily returns." },
  { value: "aggressive", body: "Higher returns, higher volatility." },
];

export function CreateAccountDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (account: Account) => void;
}) {
  const [tier, setTier] = useState<RiskTier>("standard");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("create_account", {
      p_risk_tier: tier,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message.replace(/^.*: /, "") || "Could not create account");
      return;
    }
    onCreated(data as Account);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create account</DialogTitle>
          <DialogDescription>Pick a risk tier.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Risk tier</Label>
          <div className="grid gap-2">
            {TIERS.map(({ value, body }) => {
              const active = value === tier;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTier(value)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition",
                    active
                      ? "border-orange bg-orange/10 ring-2 ring-orange"
                      : "border-border bg-card hover:border-orange/40"
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="font-display text-base text-ink">
                      {RISK_LABEL[value]}
                    </span>
                    <span className="text-xs font-bold text-orange">
                      +{DAILY_RETURN_PCT[value]}%/day
                    </span>
                  </span>
                  <span className="text-xs text-muted-label">{body}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="bg-orange text-white hover:bg-orange/90"
          >
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}