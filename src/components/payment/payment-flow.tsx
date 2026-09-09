"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotAccountSelect } from "@/components/packages/bot-account-select";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
import { CryptoDepositMethods } from "@/components/payment/crypto-deposit-methods";
import {
  formatUsd,
  PAYMENT_KIND_LABEL,
  RISK_LABEL,
  WEEKLY_PROFIT_PCT,
} from "@/lib/format";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  PaymentKind,
  UserPackage,
} from "@/lib/types";
import { MIN_BALANCE_TOPUP_USD, MAX_BALANCE_TOPUP_USD, SIGNAL_PRICE_USD } from "@/lib/types";
import { clampUsdInput } from "@/lib/amount";
import {
  firstAvailableRail,
  formatRail,
  type PaymentRail,
} from "@/lib/wallets";
import Link from "next/link";

type Phase = "details" | "deposit" | "pending" | "success" | "rejected";

export function PaymentFlow({
  kind = "package",
  packages = [],
  variants = [],
  depositAddresses,
  initialVariantId,
  initialPayments = [],
  botAccounts = [],
  initialBotAccountId,
  showHistory = false,
  embedded = false,
  hideBotSelect = false,
}: {
  kind?: PaymentKind;
  packages?: Package[];
  variants?: PackageVariant[];
  depositAddresses: DepositAddress[];
  initialVariantId?: string | null;
  initialPayments?: Payment[];
  botAccounts?: UserPackage[];
  initialBotAccountId?: string;
  showHistory?: boolean;
  embedded?: boolean;
  hideBotSelect?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const defaultVariant =
    initialVariantId ??
    variants.find((v) => {
      const pkg = packages.find((p) => p.id === v.package_id);
      return pkg?.is_featured && v.risk_tier === "standard";
    })?.id ??
    variants[0]?.id ??
    "";

  const [variantId, setVariantId] = useState(defaultVariant);
  const [currency, setCurrency] = useState<PaymentRail>(() =>
    firstAvailableRail(
      depositAddresses.filter((d) => d.is_active).map((d) => d.currency)
    )
  );
  const [amountUsd, setAmountUsd] = useState("100");
  const [botAccountId, setBotAccountId] = useState(
    initialBotAccountId && botAccounts.some((a) => a.id === initialBotAccountId)
      ? initialBotAccountId
      : (botAccounts[0]?.id ?? "")
  );
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("details");
  const [activePayment, setActivePayment] = useState<Payment | null>(null);

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId]
  );
  const pkg = packages.find((p) => p.id === variant?.package_id);

  const dueAmount =
    kind === "signal"
      ? SIGNAL_PRICE_USD
      : kind === "balance"
        ? Number(amountUsd) || 0
        : Number(pkg?.price_usd ?? variant?.price_usd ?? 0);

  useEffect(() => {
    if (initialVariantId) setVariantId(initialVariantId);
  }, [initialVariantId]);

  useEffect(() => {
    if (
      initialBotAccountId &&
      botAccounts.some((a) => a.id === initialBotAccountId)
    ) {
      setBotAccountId(initialBotAccountId);
      return;
    }
    if (botAccounts[0]?.id) setBotAccountId(botAccounts[0].id);
  }, [botAccounts, initialBotAccountId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`payments-user-${kind}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const row = payload.new as Payment;
            if ((row.kind ?? "package") !== kind) return;
            if (activePayment && row.id === activePayment.id) {
              setActivePayment(row);
              if (row.status === "confirmed") {
                setPhase("success");
                toast.success(
                  kind === "balance"
                    ? "Balance updated"
                    : kind === "signal"
                      ? "Signal access granted"
                      : "Package activated"
                );
              }
              if (row.status === "rejected") {
                setPhase("rejected");
                toast.message("Payment rejected");
              }
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activePayment, kind]);

  async function submit() {
    setError(null);
    if (kind === "package" && !variantId) {
      setError("Select a package plan");
      return;
    }
    if (kind === "balance") {
      if (!botAccountId) {
        setError("Select a bot account to deposit into.");
        return;
      }
      if (!Number.isFinite(dueAmount) || dueAmount < MIN_BALANCE_TOPUP_USD) {
        setError(`Minimum top-up is ${formatUsd(MIN_BALANCE_TOPUP_USD)}`);
        return;
      }
      if (dueAmount > MAX_BALANCE_TOPUP_USD) {
        setError(`Maximum per payment is ${formatUsd(MAX_BALANCE_TOPUP_USD)}`);
        return;
      }
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
          kind,
          packageVariantId: kind === "package" ? variantId : undefined,
          amountUsd: kind === "balance" ? dueAmount : undefined,
          userPackageId: kind === "balance" ? botAccountId : undefined,
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

  function reset() {
    setPhase("details");
    setActivePayment(null);
    setTxHash("");
    setNote("");
    setError(null);
  }

  function continueToDeposit() {
    setError(null);
    if (kind === "package" && !variantId) {
      setError("Select a package plan");
      return;
    }
    if (kind === "balance") {
      if (!botAccountId && !hideBotSelect) {
        setError("Select a bot account to deposit into.");
        return;
      }
      if (!Number.isFinite(dueAmount) || dueAmount < MIN_BALANCE_TOPUP_USD) {
        setError(`Minimum top-up is ${formatUsd(MIN_BALANCE_TOPUP_USD)}`);
        return;
      }
      if (dueAmount > MAX_BALANCE_TOPUP_USD) {
        setError(`Maximum per payment is ${formatUsd(MAX_BALANCE_TOPUP_USD)}`);
        return;
      }
    }
    setPhase("deposit");
  }

  const titles = {
    package: {
      form: "Buy a new bot",
      hint: "Starts a new bot after approval.",
      success: "New bot activated",
      successBody: `Your ${pkg?.name ?? ""} bot is ready. Add funds from Cashier when you like.`,
    },
    balance: {
      form: "Add funds to bot",
      hint: "Top up the selected bot.",
      success: "Funds credited",
      successBody: "Balance updated for that bot.",
    },
    signal: {
      form: "Legacy signals",
      hint: "This purchase path is no longer offered.",
      success: "Access recorded",
      successBody: "Contact support if you need help with an older purchase.",
    },
  }[kind];

  if (phase === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
          <Check className="size-7 text-teal" />
        </div>
        <h3 className="mt-4 font-display text-2xl text-ink">{titles.success}</h3>
        <p className="mt-2 text-sm text-muted-label">{titles.successBody}</p>
        <div className="mt-4">
          <Button variant="outline" onClick={reset}>
            Make another payment
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "rejected") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-hotpink/15">
          <X className="size-7 text-hotpink" />
        </div>
        <h3 className="mt-4 font-display text-2xl text-ink">Payment rejected</h3>
        <p className="mt-2 text-sm text-muted-label">
          {activePayment?.admin_note || "This payment was not approved."}
        </p>
        <Button
          className="mt-6 bg-orange text-white hover:bg-orange/90"
          onClick={reset}
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
            <h3 className="font-display text-lg text-ink">Submitted for review</h3>
            <p className="text-sm text-muted-label">
              An admin must approve or reject this deposit before it is applied.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-orange/15 px-3 py-1 text-xs font-semibold text-ink">
            <span className="size-2 animate-pulse rounded-full bg-orange" />
            Pending review
          </span>
        </div>
        <div className="rounded-xl bg-canvas p-4 text-sm">
          <p className="font-display tabular">
            {PAYMENT_KIND_LABEL[kind]} · {formatUsd(activePayment?.amount_usd ?? 0)} ·{" "}
            {activePayment ? formatRail(activePayment.currency) : ""}
          </p>
          <p className="mt-1 break-all text-xs tabular text-muted-label">
            Tx: {activePayment?.tx_hash}
          </p>
        </div>
      </div>
    );
  }

  if (kind === "balance" && botAccounts.length === 0) {
    return (
      <div className="rounded-2xl bg-canvas p-6 text-center">
        <h3 className="font-display text-lg text-ink">No bot account yet</h3>
        <p className="mt-2 text-sm text-muted-label">
          Buy a bot plan first. After approval you&apos;ll get a bot ID to
          deposit into.
        </p>
        <Link
          href="/dashboard/packages"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white hover:bg-orange/90"
        >
          Buy Bot
        </Link>
      </div>
    );
  }

  void showHistory;
  void initialPayments;

  return (
    <motion.div
      key={phase}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      {!embedded && (
        <div>
          <h3 className="font-display text-lg text-ink">{titles.form}</h3>
          <p className="text-sm text-muted-label">{titles.hint}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-label">
        <span className={phase === "details" ? "text-orange" : "text-muted-label"}>
          1 · Details
        </span>
        <span>/</span>
        <span className={phase === "deposit" ? "text-orange" : "text-muted-label"}>
          2 · Deposit
        </span>
      </div>

      {phase === "details" && (
        <>
          {kind === "package" && (
            <div className="space-y-3">
              <PackageVariantPicker
                packages={packages}
                variants={variants}
                selectedId={variantId}
                onSelect={(v) => setVariantId(v.id)}
              />
              {variant && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Meta
                    label="Risk Terms"
                    value={RISK_LABEL[variant.risk_tier]}
                  />
                  <Meta label="Amount" value={formatUsd(dueAmount)} />
                  <Meta label="Lot Size" value={String(variant.max_lot_size)} />
                  <Meta
                    label="Max Drawdown"
                    value={`${variant.max_drawdown_pct}%`}
                  />
                  <Meta
                    label="Target Profit"
                    value={`${WEEKLY_PROFIT_PCT[variant.risk_tier]}%`}
                  />
                </div>
              )}
            </div>
          )}

          {kind === "balance" && (
            <div className="grid gap-4">
              {!hideBotSelect && (
                <BotAccountSelect
                  accounts={botAccounts}
                  value={botAccountId}
                  onChange={setBotAccountId}
                />
              )}
              <div className="rounded-2xl bg-canvas p-4 sm:p-5">
                <Label htmlFor="topup">Amount (USD)</Label>
                <Input
                  id="topup"
                  type="number"
                  min={MIN_BALANCE_TOPUP_USD}
                  max={MAX_BALANCE_TOPUP_USD}
                  step="1"
                  className="mt-2 bg-white tabular"
                  value={amountUsd}
                  onChange={(e) =>
                    setAmountUsd(
                      clampUsdInput(e.target.value, MAX_BALANCE_TOPUP_USD)
                    )
                  }
                />
                <p className="mt-2 text-xs text-muted-label">
                  Max {formatUsd(MAX_BALANCE_TOPUP_USD)} per payment.
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-label">Additional capital</p>
                  <p className="font-display text-xl tabular text-orange">
                    {formatUsd(dueAmount)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-hotpink">{error}</p>}
          <Button
            className="w-full bg-orange text-white hover:bg-orange/90 sm:w-auto"
            onClick={continueToDeposit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Loading
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </>
      )}

      {phase === "deposit" && (
        <>
          <button
            type="button"
            onClick={() => setPhase("details")}
            className="text-sm font-semibold text-orange hover:underline"
          >
            ← Back to details
          </button>
          <CryptoDepositMethods
            depositAddresses={depositAddresses}
            currency={currency}
            onCurrencyChange={setCurrency}
            amountDue={dueAmount}
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
