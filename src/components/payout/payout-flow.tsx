"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUsd } from "@/lib/format";
import { validateCryptoAddress } from "@/lib/address-validation";
import type { CryptoCurrency, Payout, WalletBalance } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PayoutFlow({
  initialWallet,
  initialPayouts,
}: {
  initialWallet: WalletBalance | null;
  initialPayouts: Payout[];
}) {
  const [wallet, setWallet] = useState(initialWallet);
  const [payouts, setPayouts] = useState(initialPayouts);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<CryptoCurrency>("USDT");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Payout | null>(null);

  const available = Number(wallet?.available_usd ?? 0);

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
        { event: "UPDATE", schema: "public", table: "wallet_balances" },
        (payload) => {
          setWallet(payload.new as WalletBalance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function submit() {
    setError(null);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount");
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
      setCurrency(result.currency);
      setAddress("");
    }
    setResult(null);
  }

  if (result?.status === "sent") {
    return (
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
            <Check className="size-7 text-teal" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-ink">Payout sent</h2>
          <p className="mt-2 text-sm tabular text-muted-label">
            {formatUsd(result.amount_usd)} · {result.currency}
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
      <section className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-hotpink/15">
            <X className="size-7 text-hotpink" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-ink">Payout rejected</h2>
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

  return (
    <section className="rounded-2xl border-2 border-orange/40 bg-white p-6 shadow-sm md:p-8">
      <h2 className="text-xl font-bold text-ink">Payout</h2>
      <p className="mt-1 text-sm text-muted-label">
        Withdrawals are reviewed by an admin before crypto is sent.
      </p>

      <div className="mt-6 rounded-xl bg-ink p-5 text-white">
        <p className="text-xs uppercase tracking-wide text-white/60">
          Available balance
        </p>
        <p className="mt-1 text-3xl font-extrabold tabular text-gold">
          {formatUsd(available)}
        </p>
        <p className="mt-1 text-xs text-white/50 tabular">
          Pending {formatUsd(wallet?.pending_usd ?? 0)}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="amount">Amount (USD)</Label>
          <Input
            id="amount"
            className="bg-canvas tabular"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={currency}
            onValueChange={(v) => v && setCurrency(v as CryptoCurrency)}
          >
            <SelectTrigger className="w-full bg-canvas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BTC">BTC</SelectItem>
              <SelectItem value="ETH">ETH</SelectItem>
              <SelectItem value="USDT">USDT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Destination address</Label>
          <Input
            id="address"
            className="bg-canvas tabular"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Wallet address"
          />
        </div>
      </div>

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
          "Request payout"
        )}
      </Button>

      {result?.status === "requested" && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-ink">
          <span className="size-2 animate-pulse rounded-full bg-gold" />
          Pending review
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-sm font-semibold text-ink">Recent payouts</h3>
        {payouts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-label">
            No payout requests yet. Request one when you have available balance.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payouts.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-sm"
              >
                <span className="tabular font-medium">
                  {formatUsd(p.amount_usd)} {p.currency}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                    p.status === "sent" && "bg-teal/15 text-teal",
                    p.status === "rejected" && "bg-hotpink/15 text-hotpink",
                    (p.status === "requested" ||
                      p.status === "pending_review" ||
                      p.status === "processing") &&
                      "bg-gold/20 text-ink"
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
    </section>
  );
}
