"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { formatUsd } from "@/lib/format";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";

type Direction = "internal" | "external";

export function TransferDialog({
  open,
  sourceAccountId,
  accounts,
  onClose,
}: {
  open: boolean;
  sourceAccountId: string;
  accounts: Account[];
  onClose: () => void;
}) {
  const router = useRouter();
  const source = useMemo(
    () => accounts.find((a) => a.id === sourceAccountId) ?? null,
    [accounts, sourceAccountId]
  );
  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.id !== sourceAccountId),
    [accounts, sourceAccountId]
  );

  const [direction, setDirection] = useState<Direction>("external");
  const [targetAccountId, setTargetAccountId] = useState<string>(
    otherAccounts[0]?.id ?? ""
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (direction === "internal" && otherAccounts[0])
      setTargetAccountId(otherAccounts[0].id);
  }, [direction, otherAccounts, open]);

  async function submit() {
    setError(null);
    if (!source) {
      setError("Source account missing.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    if (value > Number(source.available_usd)) {
      setError(`Amount exceeds available ${formatUsd(source.available_usd)}.`);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    let rpcErr: { message: string } | null = null;
    if (direction === "internal") {
      if (!targetAccountId) {
        setError("Pick a destination account.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.rpc("transfer_between_accounts", {
        p_from_account_id: source.id,
        p_to_account_id: targetAccountId,
        p_amount_usd: value,
      });
      rpcErr = error;
    } else {
      if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
        setError("Enter a valid recipient email.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.rpc("transfer_to_user", {
        p_from_account_id: source.id,
        p_to_email: recipientEmail.trim(),
        p_amount_usd: value,
        p_note: note.trim() || null,
      });
      rpcErr = error;
    }
    setLoading(false);
    if (rpcErr) {
      setError(
        rpcErr.message.replace(/^.*: /, "") || "Could not submit transfer"
      );
      return;
    }
    if (direction === "internal") {
      toast.success(`Internal transfer of ${formatUsd(value)} completed.`);
    } else {
      toast.success(
        `Transfer of ${formatUsd(value)} pending confirmation by ${recipientEmail}.`
      );
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer</DialogTitle>
          <DialogDescription>
            Move funds between accounts or users.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">From</p>
            {source && (
              <>
                <p className="mt-1 font-display text-lg text-orange">
                  {source.name}
                </p>
                <p className="font-mono text-xs text-muted-label">
                  {source.account_code}
                </p>
                <p className="mt-2 text-xs text-muted-label">
                  Available{" "}
                  <span className="font-bold tabular text-ink">
                    {formatUsd(source.available_usd)}
                  </span>
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection("internal")}
              disabled={otherAccounts.length === 0}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                direction === "internal"
                  ? "border-orange bg-orange/10 text-orange ring-2 ring-orange"
                  : "border-border bg-card text-ink/70 hover:border-orange/40",
                otherAccounts.length === 0 &&
                  "cursor-not-allowed opacity-50"
              )}
            >
              My account
            </button>
            <button
              type="button"
              onClick={() => setDirection("external")}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                direction === "external"
                  ? "border-orange bg-orange/10 text-orange ring-2 ring-orange"
                  : "border-border bg-card text-ink/70 hover:border-orange/40"
              )}
            >
              Other user
            </button>
          </div>

          {direction === "internal" ? (
            <div className="space-y-2">
              <Label>To account</Label>
              {otherAccounts.length === 0 ? (
                <p className="text-sm text-muted-label">
                  You only have one account. Create another to use internal
                  transfers.
                </p>
              ) : (
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
                >
                  {otherAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} — {a.account_code}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="someone@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-label">
                Recipient must already have an account. They&apos;ll get a
                confirmation link valid for 2 hours.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Amount (USD)</Label>
            <Input
              id="transfer-amount"
              type="number"
              min={1}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {direction === "external" && (
            <div className="space-y-2">
              <Label htmlFor="transfer-note">Note (optional)</Label>
              <Input
                id="transfer-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What is this for?"
              />
            </div>
          )}

          {error && <p className="text-sm text-hotpink">{error}</p>}

          <Button
            className="w-full gap-2 bg-orange text-white hover:bg-orange/90"
            onClick={() => void submit()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting
              </>
            ) : (
              <>
                <ArrowLeftRight className="size-4" />
                {direction === "internal"
                  ? "Transfer now"
                  : "Send for confirmation"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
