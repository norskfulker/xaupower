"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, ScanLine, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotAccountSelect } from "@/components/packages/bot-account-select";
import { formatUsd } from "@/lib/format";
import {
  validateCryptoAddress,
  addressNetworkHint,
  isValidCryptoAddress,
} from "@/lib/address-validation";
import { CurrencyNetworkFields } from "@/components/finance/currency-network-fields";
import {
  PAYMENT_RAILS,
  formatRail,
  isPaymentRail,
  type PaymentRail,
} from "@/lib/wallets";
import type { Payout, SavedPayoutAddress, UserPackage } from "@/lib/types";
import { MIN_WITHDRAWAL_USD } from "@/lib/types";
import { clampUsdInput } from "@/lib/amount";
import { QrScannerDialog } from "@/components/qr/qr-scanner-dialog";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function savedAddressLabel(row: SavedPayoutAddress) {
  return `${row.label}${row.is_primary ? " (primary)" : ""} - ${formatRail(row.currency)}`;
}

export function PayoutFlow({
  botAccounts = [],
  initialPayouts,
  savedAddresses = [],
  initialBotAccountId,
  showHistory = true,
  embedded = false,
  hideBotSelect = false,
}: {
  botAccounts?: UserPackage[];
  initialPayouts: Payout[];
  savedAddresses?: SavedPayoutAddress[];
  initialBotAccountId?: string;
  showHistory?: boolean;
  embedded?: boolean;
  hideBotSelect?: boolean;
}) {
  const [accounts, setAccounts] = useState(botAccounts);
  const [botAccountId, setBotAccountId] = useState(
    initialBotAccountId &&
      botAccounts.some((a) => a.id === initialBotAccountId)
      ? initialBotAccountId
      : (botAccounts[0]?.id ?? "")
  );
  const [payouts, setPayouts] = useState(initialPayouts);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<PaymentRail>("USDT_TRC20");
  const [address, setAddress] = useState("");
  const [savedId, setSavedId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Payout | null>(null);

  useEffect(() => {
    setAccounts(botAccounts);
    if (
      initialBotAccountId &&
      botAccounts.some((a) => a.id === initialBotAccountId)
    ) {
      setBotAccountId(initialBotAccountId);
    } else if (botAccounts[0]?.id) {
      setBotAccountId((current) =>
        botAccounts.some((a) => a.id === current) ? current : botAccounts[0].id
      );
    }
  }, [botAccounts, initialBotAccountId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("payouts-user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payouts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Payout;
            setPayouts((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as Payout;
            setPayouts((prev) =>
              prev.map((p) => (p.id === row.id ? row : p))
            );
            if (row.status === "sent") {
              toast.success("Payout sent");
              setResult(row);
            }
            if (row.status === "rejected" || row.status === "failed") {
              toast.message("Payout update", {
                description: row.admin_note ?? row.status,
              });
              setResult(row);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_packages" },
        (payload) => {
          const row = payload.new as UserPackage;
          setAccounts((prev) =>
            prev.map((a) => (a.id === row.id ? { ...a, ...row } : a))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const selectedAccount = accounts.find((a) => a.id === botAccountId);
  const available = Number(selectedAccount?.available_usd ?? 0);
  const selectedSaved = savedAddresses.find((s) => s.id === savedId);

  useEffect(() => {
    setAmount((prev) => clampUsdInput(prev, available));
  }, [available]);

  async function submit() {
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_WITHDRAWAL_USD) {
      setError(`Minimum withdrawal is ${formatUsd(MIN_WITHDRAWAL_USD)}`);
      return;
    }
    if (value > available) {
      setError(
        `Amount exceeds your available balance of $${available.toFixed(2)}`
      );
      return;
    }
    const addrErr = validateCryptoAddress(currency, address);
    if (addrErr) {
      setError(addrErr);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: value,
          currency,
          destinationAddress: address,
          userPackageId: botAccountId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not request payout");
        return;
      }
      toast.message("Payout requested");
      setAmount("");
      setAddress("");
      setResult({
        id: data.payoutId,
        user_id: "",
        amount_usd: value,
        currency,
        destination_address: address,
        nowpayments_payout_id: null,
        status: "requested",
        requested_at: new Date().toISOString(),
        reviewed_by: null,
        reviewed_at: null,
        tx_hash: null,
        admin_note: null,
      });
    } catch {
      setError("Could not request payout. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function tryAgain() {
    if (result) {
      setAmount(String(result.amount_usd));
      setCurrency(isPaymentRail(result.currency) ? result.currency : "USDT_TRC20");
      setAddress("");
    }
    setResult(null);
  }

  if (result?.status === "sent") {
    return (
      <section className="rounded-2xl bg-card p-8 shadow-card sm:p-9">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
            <Check className="size-7 text-teal" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">
            Payout sent
          </h2>
          <p className="mt-2 text-sm tabular text-muted-label">
            {formatUsd(result.amount_usd)} - {formatRail(result.currency)}
          </p>
          <p className="mt-1 break-all text-xs tabular text-muted-label">
            {result.destination_address}
          </p>
          {result.tx_hash && (
            <p className="mt-3 break-all text-xs tabular text-ink">
              Tx: {result.tx_hash}
            </p>
          )}
          <Button className="mt-6" variant="outline" onClick={() => setResult(null)}>
            Back to payouts
          </Button>
        </div>
      </section>
    );
  }

  if (result?.status === "rejected" || result?.status === "failed") {
    return (
      <section className="rounded-2xl bg-card p-8 shadow-card sm:p-9">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-hotpink/15">
            <X className="size-7 text-hotpink" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">
            Payout rejected
          </h2>
          <p className="mt-2 text-sm text-muted-label">
            {result.admin_note || "This payout was not approved."}
          </p>
          <Button
            className="mt-6 bg-orange text-white hover:bg-orange/90"
            onClick={tryAgain}
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (accounts.length === 0) {
    return (
      <section className="rounded-2xl bg-canvas p-6 text-center">
        <h3 className="text-lg font-bold text-ink">No bot account</h3>
        <p className="mt-2 text-sm text-muted-label">
          Buy a bot plan to get an account ID you can withdraw from. Cashouts
          always come from one bot ID - never from combined balances.
        </p>
      </section>
    );
  }

  const formBody = (
    <>
      {!embedded && (
        <>
          <p className="text-kicker">Withdraw</p>
          <h2 className="mt-2 text-xl font-bold text-ink">Request a payout</h2>
          {accounts.length > 1 && (
            <p className="mt-2 text-sm text-muted-label">
              Payout comes from the selected bot only.
            </p>
          )}
        </>
      )}

      {!hideBotSelect && (
        <div className={embedded ? "" : "mt-6"}>
          <BotAccountSelect
            accounts={accounts}
            value={botAccountId}
            onChange={setBotAccountId}
          />
        </div>
      )}

      <div
        className={cn(
          embedded ? "mt-0" : "mt-6",
          "rounded-2xl bg-canvas p-5 text-ink sm:p-6"
        )}
      >
        <p className="text-kicker">Available</p>
        <p className="text-metric mt-3 text-orange">{formatUsd(available)}</p>
        {(selectedAccount?.pending_usd ?? 0) > 0 && (
          <p className="mt-2 text-xs tabular text-muted-label">
            Pending {formatUsd(selectedAccount?.pending_usd ?? 0)}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            className="bg-canvas tabular"
            type="number"
            min={MIN_WITHDRAWAL_USD}
            max={available}
            step="0.01"
            value={amount}
            onChange={(e) =>
              setAmount(clampUsdInput(e.target.value, available))
            }
          />
          <p className="text-xs text-muted-label">
            Max {formatUsd(available)} from this bot.
          </p>
        </div>
        <CurrencyNetworkFields
          rail={currency}
          rails={PAYMENT_RAILS}
          onChange={setCurrency}
        />
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Destination address</Label>
          {savedAddresses.length > 0 && (
            <Select
              value={savedId || null}
              onValueChange={(id) => {
                const next = id ?? "";
                setSavedId(next);
                const row = savedAddresses.find((s) => s.id === next);
                if (row) {
                  setAddress(row.address);
                  if (isPaymentRail(row.currency)) setCurrency(row.currency);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a saved address">
                  {selectedSaved
                    ? savedAddressLabel(selectedSaved)
                    : "Choose a saved address"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {savedAddresses.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {savedAddressLabel(row)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Input
              id="address"
              className={cn(
                "bg-canvas tabular",
                address.trim() &&
                  (isValidCryptoAddress(currency, address)
                    ? "border-teal focus-visible:border-teal"
                    : "border-hotpink focus-visible:border-hotpink")
              )}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              placeholder="Wallet address"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setScanOpen(true)}
            >
              <ScanLine className="size-4" />
              Scan QR
            </Button>
          </div>
          <p className="text-xs text-muted-label">
            Format check - {addressNetworkHint(currency)}
          </p>
          {address.trim() && isValidCryptoAddress(currency, address) && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-teal">
              <Check className="size-3.5" /> Address format looks valid
            </p>
          )}
          {address.trim() && !isValidCryptoAddress(currency, address) && (
            <p className="text-xs text-hotpink">
              {validateCryptoAddress(currency, address)}
            </p>
          )}
        </div>
      </div>

      <QrScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        title="Scan your payout wallet"
        onScan={(value) => {
          setAddress(value);
          toast.message("Address filled from QR");
        }}
      />

      {error && <p className="mt-3 text-sm text-hotpink">{error}</p>}

      <Button
        className="mt-6 bg-orange text-white hover:bg-orange/90"
        disabled={loading}
        onClick={submit}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" /> Submitting
          </>
        ) : (
          "Submit for admin review"
        )}
      </Button>

      {result?.status === "requested" && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange/15 px-3 py-1 text-xs font-semibold text-ink">
          <span className="size-2 animate-pulse rounded-full bg-orange" />
          Pending review
        </div>
      )}

      {showHistory && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Recent payouts</h3>
          {payouts.length === 0 ? (
            <p className="mt-2 text-sm text-muted-label">
              No payout requests yet. Request one when you have available
              balance.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {payouts.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm"
                >
                  <span className="tabular font-medium">
                    {formatUsd(p.amount_usd)} {formatRail(p.currency)}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                      p.status === "sent" && "bg-teal/15 text-teal",
                      p.status === "rejected" && "bg-hotpink/15 text-hotpink",
                      (p.status === "requested" ||
                        p.status === "pending_review" ||
                        p.status === "processing") &&
                        "bg-orange/15 text-ink"
                    )}
                  >
                    {p.status.replace("_", " ")}
                  </span>
                  {p.tx_hash && (
                    <button
                      type="button"
                      className="text-xs text-muted-label"
                      onClick={() => {
                        void navigator.clipboard.writeText(p.tx_hash!);
                        toast.message("Tx hash copied");
                      }}
                    >
                      <Copy className="inline size-3" /> tx
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{formBody}</div>;
  }

  return (
    <section className="rounded-2xl bg-card p-6 shadow-card sm:p-8">
      {formBody}
    </section>
  );
}
