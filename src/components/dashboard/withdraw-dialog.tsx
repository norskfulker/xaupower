"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
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
import {
  validateCryptoAddress,
  isValidCryptoAddress,
} from "@/lib/address-validation";
import {
  CurrencyNetworkFields,
} from "@/components/finance/currency-network-fields";
import { PAYMENT_RAILS, type PaymentRail } from "@/lib/wallets";
import { formatUsd } from "@/lib/format";
import type { Account, SavedPayoutAddress } from "@/lib/types";
import { MIN_WITHDRAWAL_USD } from "@/lib/types";

export function WithdrawDialog({
  open,
  accountId,
  accounts,
  onClose,
}: {
  open: boolean;
  accountId?: string;
  accounts: Account[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accountId ?? accounts[0]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<PaymentRail>("USDT_TRC20");
  const [address, setAddress] = useState("");
  const [savedId, setSavedId] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<SavedPayoutAddress[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();
    supabase
      .from("saved_payout_addresses")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => setSavedAddresses((data ?? []) as SavedPayoutAddress[]));
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
  const available = Number(account?.available_usd ?? 0);

  async function submit() {
    setError(null);
    if (!account) {
      setError("Pick an account.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_WITHDRAWAL_USD) {
      setError(`Minimum withdrawal is ${formatUsd(MIN_WITHDRAWAL_USD)}.`);
      return;
    }
    if (value > available) {
      setError(`Amount exceeds available balance of ${formatUsd(available)}.`);
      return;
    }
    const addrErr = validateCryptoAddress(currency, address);
    if (addrErr) {
      setError(addrErr);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: rpcErr } = await supabase.rpc("request_withdrawal", {
      p_account_id: account.id,
      p_amount_usd: value,
      p_currency: currency,
      p_destination_address: address,
    });
    setLoading(false);
    if (rpcErr) {
      setError(
        rpcErr.message.replace(/^.*: /, "") || "Could not request withdrawal"
      );
      return;
    }
    toast.success(
      `Withdrawal of ${formatUsd(value)} requested from ${account.name}.`
    );
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Withdraw</DialogTitle>
          <DialogDescription>Send funds to your wallet.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {accountId == null && accounts.length > 1 && (
            <div className="space-y-2">
              <Label>Account</Label>
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

          <div className="rounded-2xl bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">Available</p>
            <p className="mt-1 text-2xl font-black tabular text-orange">
              {formatUsd(available)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wd-amount">Amount (USD)</Label>
              <Input
                id="wd-amount"
                type="number"
                min={MIN_WITHDRAWAL_USD}
                max={available}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <CurrencyNetworkFields
              rail={currency}
              rails={PAYMENT_RAILS}
              onChange={setCurrency}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wd-address">Destination address</Label>
            {savedAddresses.length > 0 && (
              <select
                value={savedId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSavedId(id);
                  const row = savedAddresses.find((s) => s.id === id);
                  if (row) {
                    setAddress(row.address);
                    if (row.currency === "USDT") {
                      setCurrency("USDT_TRC20");
                    } else {
                      setCurrency(row.currency);
                    }
                  }
                }}
                className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="">Use a new address</option>
                {savedAddresses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label} — {row.currency}
                  </option>
                ))}
              </select>
            )}
            <Input
              id="wd-address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              placeholder="Wallet address"
            />
            {address && !isValidCryptoAddress(currency, address) && (
              <p className="text-xs text-hotpink">
                {validateCryptoAddress(currency, address)}
              </p>
            )}
          </div>

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
                <ArrowUpRight className="size-4" /> Request withdrawal
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
