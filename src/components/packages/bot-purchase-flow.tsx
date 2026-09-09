"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CryptoDepositMethods } from "@/components/payment/crypto-deposit-methods";
import { displayStrategyLabel } from "@/lib/package-display";
import {
  formatUsd,
  formatUsdInteger,
  RISK_LABEL,
  WEEKLY_PROFIT_PCT,
} from "@/lib/format";
import type { DepositAddress, Package, PackageVariant, Payment } from "@/lib/types";
import { MAX_BALANCE_TOPUP_USD } from "@/lib/types";
import { clampUsdInput } from "@/lib/amount";
import {
  firstAvailableRail,
  formatRail,
  type PaymentRail,
} from "@/lib/wallets";

type Phase = "details" | "deposit" | "pending" | "success" | "rejected";

export function BotPurchaseFlow({
  package: pkg,
  variant,
  depositAddresses,
  onSubmitted,
}: {
  package: Package;
  variant: PackageVariant;
  depositAddresses: DepositAddress[];
  onSubmitted?: (payment: Payment) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState<Phase>("details");
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
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const strategyLabel = displayStrategyLabel(variant);
  const planAsset = Math.round(Number(pkg.price_usd ?? variant.price_usd ?? 0));
  const maxExtra = MAX_BALANCE_TOPUP_USD - planAsset;
  const extraAmount =
    additionalAmount.trim() === "" ? 0 : Number(additionalAmount);
  const totalDue = planAsset + (Number.isFinite(extraAmount) ? extraAmount : 0);
  const riskTier = variant.risk_tier;

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
            setStep("success");
            toast.success("Bot plan activated");
          }
          if (row.status === "rejected") {
            setStep("rejected");
            toast.message("Payment rejected");
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePayment, variant.id]);

  async function submit() {
    setError(null);
    if (!Number.isFinite(totalDue) || totalDue < planAsset) {
      setError("Invalid funding amount");
      return;
    }
    if (
      additionalAmount.trim() !== "" &&
      (!Number.isFinite(extraAmount) || extraAmount < 0)
    ) {
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
      setStep("pending");
      onSubmitted?.({
        ...(data.payment as Payment),
        kind: "package",
        status: (data.payment as Payment).status ?? "pending_review",
        variant_snapshot:
          (data.payment as Payment).variant_snapshot ??
          ({
            id: variant.id,
            package_id: variant.package_id,
            package_name: pkg.name,
            risk_tier: variant.risk_tier,
            strategy_label: strategyLabel,
            price_usd: Number(variant.price_usd),
            max_lot_size: Number(variant.max_lot_size),
            profit_target_pct: Number(variant.profit_target_pct),
            max_drawdown_pct: Number(variant.max_drawdown_pct),
            roadmap: variant.roadmap ?? [],
          } as Payment["variant_snapshot"]),
        package_variants: {
          ...variant,
          packages: pkg,
        },
      });
      toast.message("Submitted for review");
    } catch {
      setError("Could not submit payment. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
          <Check className="size-7 text-teal" />
        </div>
        <h3 className="mt-4 font-display text-xl text-ink">Bot activated</h3>
        <p className="mt-2 text-sm text-muted-label">
          {pkg.name} is live. Check transaction history for your bot ID.
        </p>
      </div>
    );
  }

  if (step === "rejected") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-hotpink/15">
          <X className="size-7 text-hotpink" />
        </div>
        <h3 className="mt-4 font-display text-xl text-ink">Rejected</h3>
        <p className="mt-2 text-sm text-muted-label">
          {activePayment?.admin_note || "Payment was not approved."}
        </p>
        <Button
          className="mt-6 bg-orange text-white hover:bg-orange/90"
          onClick={() => setStep("details")}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (step === "pending") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg text-ink">Pending review</h3>
          <span className="inline-flex items-center gap-2 rounded-full bg-orange/15 px-3 py-1 text-xs font-semibold text-ink">
            <span className="size-2 animate-pulse rounded-full bg-orange" />
            Pending
          </span>
        </div>
        <div className="rounded-xl bg-canvas p-4 text-sm">
          <p className="font-display tabular">
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
    <motion.div
      key={step}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 border-t border-border pt-6"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-label">
        <span
          className={
            step === "details" ? "text-orange" : "text-muted-label"
          }
        >
          1 · Plan
        </span>
        <span>/</span>
        <span
          className={
            step === "deposit" ? "text-orange" : "text-muted-label"
          }
        >
          2 · Deposit
        </span>
      </div>

      {step === "details" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Meta
              label="Risk Terms"
              value={RISK_LABEL[riskTier] ?? strategyLabel}
            />
            <Meta label="Amount" value={formatUsdInteger(planAsset)} />
            <Meta label="Lot Size" value={String(variant.max_lot_size)} />
            <Meta
              label="Max Drawdown"
              value={`${variant.max_drawdown_pct}%`}
            />
            <Meta
              label="Target Profit"
              value={`${WEEKLY_PROFIT_PCT[riskTier] ?? variant.profit_target_pct}%`}
            />
            <div className="rounded-2xl bg-canvas p-4 sm:col-span-2 sm:p-5">
              <Label htmlFor="additional-capital">
                Additional capital (optional)
              </Label>
              <Input
                id="additional-capital"
                type="number"
                min={0}
                max={maxExtra}
                step="1"
                placeholder="0"
                className="mt-2 bg-white tabular"
                value={additionalAmount}
                onChange={(e) =>
                  setAdditionalAmount(
                    clampUsdInput(e.target.value, Math.max(0, maxExtra))
                  )
                }
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-label">Total due</p>
                <p className="font-display text-xl tabular text-orange">
                  {formatUsdInteger(totalDue)}
                </p>
              </div>
            </div>
          </div>
          <Button
            className="w-full bg-orange text-white hover:bg-orange/90 sm:w-auto"
            onClick={() => setStep("deposit")}
          >
            Continue
          </Button>
        </>
      )}

      {step === "deposit" && (
        <>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="text-sm font-semibold text-orange hover:underline"
          >
            ← Back to plan details
          </button>
          <CryptoDepositMethods
            depositAddresses={depositAddresses}
            currency={currency}
            onCurrencyChange={setCurrency}
            amountDue={totalDue}
            txHash={txHash}
            onTxHashChange={setTxHash}
            note={note}
            onNoteChange={setNote}
            error={error}
            loading={loading}
            onSubmit={() => void submit()}
          />
        </>
      )}
    </motion.div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-canvas p-4 sm:p-5">
      <p className="text-kicker">{label}</p>
      <p className="mt-3 font-display text-2xl tabular text-ink sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
