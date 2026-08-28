"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BOT_PLAN_SPECS } from "@/lib/bot-plans";
import {
  formatUsd,
  formatUsdInteger,
  PLAN_ACCESS_TERM,
} from "@/lib/format";
import type { DepositAddress, Package, PackageVariant, Payment } from "@/lib/types";
import { MAX_BALANCE_TOPUP_USD, PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";
import { CurrencyNetworkFields } from "@/components/finance/currency-network-fields";
import {
  ASSET_LABEL,
  CHAIN_LABEL,
  RAIL_ASSET,
  RAIL_CHAIN,
  RAIL_HINT,
  firstAvailableRail,
  formatRail,
  railNetwork,
  railsForNetworks,
  type PaymentRail,
} from "@/lib/wallets";

type Phase = "form" | "pending" | "success" | "rejected";

export function BotPurchaseFlow({
  package: pkg,
  variant,
  depositAddresses,
}: {
  package: Package;
  variant: PackageVariant;
  depositAddresses: DepositAddress[];
}) {
  const [currency, setCurrency] = useState<PaymentRail>(() =>
    firstAvailableRail(
      depositAddresses.filter((d) => d.is_active).map((d) => d.currency)
    )
  );
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const planName = pkg.name as "Assay" | "Bullion" | "Vault";
  const strategyLabel = BOT_PLAN_SPECS[planName].strategy;
  const planAsset = Math.round(Number(pkg.price_usd ?? variant.price_usd ?? 0));
  const maxExtra = MAX_BALANCE_TOPUP_USD - planAsset;
  const extraAmount = additionalAmount.trim() === "" ? 0 : Number(additionalAmount);
  const totalDue = planAsset + (Number.isFinite(extraAmount) ? extraAmount : 0);

  const availableRails = railsForNetworks(
    depositAddresses.filter((d) => d.is_active).map((d) => d.currency)
  );
  const deposit = depositAddresses.find(
    (d) => d.currency === railNetwork(currency) && d.is_active
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`bot-purchase-${variant.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payments" },
        (payload) => {
          const row = payload.new as Payment;
          if (!activePayment || row.id !== activePayment.id) return;
          setActivePayment(row);
          if (row.status === "confirmed") {
            setPhase("success");
            toast.success("Bot plan activated");
          }
          if (row.status === "rejected") {
            setPhase("rejected");
            toast.message("Payment rejected");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePayment, variant.id]);

  function copyAddress() {
    if (!deposit?.address) return;
    void navigator.clipboard.writeText(deposit.address);
    toast.message("Address copied");
  }

  function copyAmountDue() {
    void navigator.clipboard.writeText(formatUsd(totalDue));
    toast.message("Amount due copied");
  }

  async function submit() {
    setError(null);
    if (!Number.isFinite(totalDue) || totalDue < planAsset) {
      setError("Invalid funding amount");
      return;
    }
    if (additionalAmount.trim() !== "" && (!Number.isFinite(extraAmount) || extraAmount < 0)) {
      setError("Enter a valid additional amount or leave blank");
      return;
    }
    if (totalDue > MAX_BALANCE_TOPUP_USD) {
      setError(`Maximum per payment is ${formatUsd(MAX_BALANCE_TOPUP_USD)}`);
      return;
    }
    if (!txHash.trim()) {
      setError("Enter the transaction hash");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "package",
          packageVariantId: variant.id,
          initialDepositUsd: extraAmount > 0 ? extraAmount : 0,
          currency,
          txHash,
          userNote: note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit payment");
        return;
      }
      setActivePayment(data.payment as Payment);
      setPhase("pending");
      toast.message("Submitted for review");
    } catch {
      setError("Could not submit payment. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
          <Check className="size-7 text-teal" />
        </div>
        <h3 className="mt-4 text-2xl font-extrabold text-ink">Bot purchase submitted</h3>
        <p className="mt-2 text-sm text-muted-label">
          After approval your {pkg.name} {strategyLabel} bot activates
          for {PLAN_ACCESS_TERM}. The full amount credits your bot account balance.
          Add more anytime from Cashier once the bot is running.
        </p>
      </div>
    );
  }

  if (phase === "rejected") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-hotpink/15">
          <X className="size-7 text-hotpink" />
        </div>
        <h3 className="mt-4 text-2xl font-extrabold text-ink">Payment rejected</h3>
        <p className="mt-2 text-sm text-muted-label">
          {activePayment?.admin_note || "This payment was not approved."}
        </p>
        <Button
          className="mt-6 bg-orange text-white hover:bg-orange/90"
          onClick={() => setPhase("form")}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (phase === "pending") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ink">Submitted for review</h3>
            <p className="text-sm text-muted-label">
              An admin must approve this payment before your bot is provisioned.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-orange/15 px-3 py-1 text-xs font-semibold text-ink">
            <span className="size-2 animate-pulse rounded-full bg-orange" />
            Pending review
          </span>
        </div>
        <div className="rounded-xl bg-canvas p-4 text-sm">
          <p className="tabular font-medium">
            {formatUsd(activePayment?.amount_usd ?? 0)} ·{" "}
            {activePayment ? formatRail(activePayment.currency) : ""}
          </p>
          <p className="mt-1 break-all text-xs tabular text-muted-label">
            Tx: {activePayment?.tx_hash}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 border-t border-border pt-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Fund your Bot to start working</h3>
        <p className="text-sm text-muted-label">
          Add funds to your bot plan to activate it. You can add more later from Cashier.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-canvas p-5">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <p className="text-kicker">Bot plan</p>
            <p className="mt-1 text-sm text-muted-label">
              Credits your bot account on approval
            </p>
          </div>
          <p className="text-2xl font-black tabular text-ink">
            {formatUsdInteger(planAsset)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="additional-amount">Add funds (optional)</Label>
          <Input
            id="additional-amount"
            type="number"
            min={0}
            max={maxExtra}
            step="1"
            placeholder="0"
            className="bg-white tabular"
            value={additionalAmount}
            onChange={(e) => setAdditionalAmount(e.target.value)}
          />
          <p className="text-xs text-muted-label">
            Optional extra if you want more capital working from day one. Max{" "}
            {formatUsdInteger(MAX_BALANCE_TOPUP_USD)} per payment.
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
          <p className="text-sm font-semibold text-ink">Total to send</p>
          <p className="text-2xl font-black tabular text-orange">
            {formatUsdInteger(totalDue)}
          </p>
        </div>
      </div>

      <CurrencyNetworkFields
        rail={currency}
        rails={availableRails}
        onChange={setCurrency}
      />

      {deposit ? (
        <div className="grid gap-4 rounded-xl border border-border bg-canvas p-4 md:grid-cols-[160px_1fr]">
          <div className="flex flex-col items-center">
            <div className="rounded-lg bg-white p-2">
              <QRCodeSVG value={deposit.address} size={120} />
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-wide text-muted-label">
              Amount due
            </p>
            <div className="flex items-center gap-1">
              <p className="text-xl font-bold tabular text-ink">
                {formatUsdInteger(totalDue)}
              </p>
              <Button type="button" size="icon" variant="ghost" onClick={copyAmountDue}>
                <Copy className="size-4" />
                <span className="sr-only">Copy amount due</span>
              </Button>
            </div>
          </div>
          <div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-label">Currency</dt>
              <dd className="font-semibold text-ink">
                {ASSET_LABEL[RAIL_ASSET[currency]]}
              </dd>
              <dt className="text-muted-label">Network</dt>
              <dd className="font-semibold text-ink">
                {CHAIN_LABEL[RAIL_CHAIN[currency]]}
              </dd>
            </dl>
            <p className="mt-3 text-xs uppercase tracking-wide text-muted-label">
              Send to
            </p>
            <div className="mt-1 flex items-start gap-2">
              <code className="flex-1 break-all text-sm tabular text-ink">
                {deposit.address}
              </code>
              <Button type="button" size="icon" variant="ghost" onClick={copyAddress}>
                <Copy className="size-4" />
                <span className="sr-only">Copy address</span>
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-label">{RAIL_HINT[currency]}</p>
            {deposit.address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX) && (
              <p className="mt-2 text-xs text-hotpink">
                Placeholder address — confirm with support before sending funds.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-hotpink">
          No active {railNetwork(currency)} deposit address. Contact support.
        </p>
      )}

      <div className="space-y-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-ink">I&apos;ve sent the payment</p>
        <div className="space-y-2">
          <Label htmlFor="bot-tx">Transaction hash</Label>
          <Input
            id="bot-tx"
            className="bg-canvas tabular"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-note">Note (optional)</Label>
          <Input
            id="bot-note"
            className="bg-canvas"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. sent from exchange"
          />
        </div>
        {error && <p className="text-sm text-hotpink">{error}</p>}
        <Button
          className="bg-orange text-white hover:bg-orange/90"
          disabled={loading || !deposit}
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
      </div>
    </div>
  );
}
