"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CryptoDepositMethods } from "@/components/payment/crypto-deposit-methods";
import { createClient } from "@/lib/supabase/client";
import { firstAvailableRail, type PaymentRail } from "@/lib/wallets";
import { formatUsd } from "@/lib/format";
import type { Account, DepositAddress, Payment } from "@/lib/types";

export function DepositDialog({
  open,
  accountId,
  accounts,
  onClose,
  initialAmountUsd,
}: {
  open: boolean;
  accountId?: string;
  accounts: Account[];
  onClose: () => void;
  initialAmountUsd?: number;
}) {
  const router = useRouter();
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);
  const [currency, setCurrency] = useState<PaymentRail>("USDT_TRC20");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accountId ?? accounts[0]?.id ?? ""
  );
  const [amountUsd, setAmountUsd] = useState<string>(
    initialAmountUsd ? String(initialAmountUsd) : ""
  );
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("deposit_addresses")
      .select("*")
      .eq("is_active", true)
      .then(({ data: rows }) => {
        setAddresses((rows ?? []) as DepositAddress[]);
        setCurrency(firstAvailableRail((rows ?? []).map((r) => r.currency)));
      });
  }, [open]);

  useEffect(() => {
    if (accountId) setSelectedAccountId(accountId);
    else if (!selectedAccountId && accounts[0])
      setSelectedAccountId(accounts[0].id);
  }, [accountId, accounts, selectedAccountId]);

  const account = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId]
  );

  async function submit() {
    setError(null);
    if (!account) {
      setError("Pick an account to deposit into.");
      return;
    }
    if (account.status !== "active") {
      setError("Account is not active.");
      return;
    }
    const amount = Number(amountUsd);
    if (!Number.isFinite(amount) || amount < 10) {
      setError("Minimum deposit is $10.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcErr } = await supabase.rpc("submit_deposit", {
      p_account_id: account.id,
      p_amount_usd: amount,
      p_currency: currency,
      p_tx_hash: txHash,
      p_user_note: note || null,
    });
    setLoading(false);
    if (rpcErr) {
      setError(rpcErr.message.replace(/^.*: /, "") || "Could not submit deposit");
      return;
    }
    toast.success(
      `Deposit of ${formatUsd(amount)} pending review on ${account.name}.`
    );
    onClose();
    router.refresh();
    return data as Payment;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Deposit</DialogTitle>
          <DialogDescription>Send any amount.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {accountId == null && accounts.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink">
                Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.account_code}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-ink">
              Amount (USD)
            </label>
            <input
              type="number"
              min={10}
              step="1"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="99"
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
            />
          </div>

          <CryptoDepositMethods
            depositAddresses={addresses}
            currency={currency}
            onCurrencyChange={setCurrency}
            amountDue={Number(amountUsd) || 0}
            txHash={txHash}
            onTxHashChange={setTxHash}
            note={note}
            onNoteChange={setNote}
            error={error}
            loading={loading}
            onSubmit={() => void submit()}
            submitLabel="Submit deposit"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}