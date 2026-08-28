"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, Copy, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BotAccountSelect } from "@/components/packages/bot-account-select";
import { PackageVariantPicker } from "@/components/packages/package-variant-picker";
import { formatUsd, PAYMENT_KIND_LABEL, RISK_LABEL } from "@/lib/format";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  PaymentKind,
  UserPackage,
} from "@/lib/types";
import {
  MIN_BALANCE_TOPUP_USD,
  MAX_BALANCE_TOPUP_USD,
  PLACEHOLDER_DEPOSIT_PREFIX,
  SIGNAL_PRICE_USD,
} from "@/lib/types";
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
import { cn } from "@/lib/utils";
import Link from "next/link";

type Phase = "form" | "pending" | "success" | "rejected";

export function PaymentFlow({
  kind = "package",
  packages = [],
  variants = [],
  depositAddresses,
  initialVariantId,
  initialPayments = [],
  botAccounts = [],
  showHistory = true,
}: {
  kind?: PaymentKind;
  packages?: Package[];
  variants?: PackageVariant[];
  depositAddresses: DepositAddress[];
  initialVariantId?: string | null;
  initialPayments?: Payment[];
  botAccounts?: UserPackage[];
  showHistory?: boolean;
}) {
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
  const [botAccountId, setBotAccountId] = useState(botAccounts[0]?.id ?? "");
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [history, setHistory] = useState(
    initialPayments.filter((p) => (p.kind ?? "package") === kind)
  );

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId]
  );
  const pkg = packages.find((p) => p.id === variant?.package_id);
  const availableRails = railsForNetworks(
    depositAddresses.filter((d) => d.is_active).map((d) => d.currency)
  );
  const deposit = depositAddresses.find(
    (d) => d.currency === railNetwork(currency) && d.is_active
  );

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
    if (botAccounts[0]?.id) setBotAccountId(botAccounts[0].id);
  }, [botAccounts]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`payments-user-${kind}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Payment;
            if ((row.kind ?? "package") !== kind) return;
            setHistory((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as Payment;
            if ((row.kind ?? "package") !== kind) return;
            setHistory((prev) =>
              prev.map((p) => (p.id === row.id ? row : p))
            );
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

  function copyAddress() {
    if (!deposit?.address) return;
    void navigator.clipboard.writeText(deposit.address);
    toast.message("Address copied");
  }

  function copyAmountDue() {
    void navigator.clipboard.writeText(formatUsd(dueAmount));
    toast.message("Amount due copied");
  }

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
    setPhase("form");
    setActivePayment(null);
    setTxHash("");
    setNote("");
    setError(null);
  }

  const titles = {
    package: {
      form: "Buy the VPS bot",
      hint: "Pay the setup fee. After admin approval we set up the VPS. Then deposit trading balance for the bot to trade.",
      success: "VPS bot activated",
      successBody: `Your ${pkg?.name ?? ""} ${variant ? RISK_LABEL[variant.risk_tier] : ""} plan is now active. Add trading balance so the bot can take XAUUSD trades.`,
    },
    balance: {
      form: "Add balance to bot account",
      hint: "Deposit more capital into your bot account ID. After approval it credits that bot's available balance.",
      success: "Balance credited",
      successBody: "Your bot account balance was updated. Withdraw from Cashier anytime.",
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
        <h3 className="mt-4 text-2xl font-extrabold text-ink">{titles.success}</h3>
        <p className="mt-2 text-sm text-muted-label">{titles.successBody}</p>
        {kind === "package" && (
          <button
            type="button"
            onClick={() => {
              /* Cashier handles balance deposits */
              window.location.href = "/dashboard";
            }}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-orange px-4 text-sm font-semibold text-white hover:bg-orange/90"
          >
            Open dashboard · Cashier
          </button>
        )}
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
        <h3 className="mt-4 text-2xl font-extrabold text-ink">Payment rejected</h3>
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
            <h3 className="text-lg font-bold text-ink">Submitted for review</h3>
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
          <p className="tabular font-medium">
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
        <h3 className="text-lg font-bold text-ink">No bot account yet</h3>
        <p className="mt-2 text-sm text-muted-label">
          Buy a bot plan first. After approval you&apos;ll get a bot account ID
          to deposit into.
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

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-ink">{titles.form}</h3>
        <p className="text-sm text-muted-label">{titles.hint}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "package" && (
          <div className="space-y-3 sm:col-span-2">
            <Label>Plan</Label>
            <PackageVariantPicker
              packages={packages}
              variants={variants}
              selectedId={variantId}
              onSelect={(v) => setVariantId(v.id)}
            />
          </div>
        )}
        {kind === "balance" && (
          <div className="space-y-4 sm:col-span-2">
            <BotAccountSelect
              accounts={botAccounts}
              value={botAccountId}
              onChange={setBotAccountId}
            />
            <div className="space-y-2">
              <Label htmlFor="topup">Amount (USD)</Label>
              <Input
                id="topup"
                type="number"
                min={MIN_BALANCE_TOPUP_USD}
                max={MAX_BALANCE_TOPUP_USD}
                step="1"
                className="bg-canvas tabular"
                value={amountUsd}
                onChange={(e) => setAmountUsd(e.target.value)}
              />
              <p className="text-xs text-muted-label">
                Max {formatUsd(MAX_BALANCE_TOPUP_USD)} per payment.
              </p>
            </div>
          </div>
        )}
        <CurrencyNetworkFields
          rail={currency}
          rails={availableRails}
          onChange={setCurrency}
        />
      </div>

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
                {formatUsd(dueAmount)}
              </p>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={copyAmountDue}
              >
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
                This is still a placeholder address. Ask support before sending
                real funds.
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
          <Label htmlFor="tx">Transaction hash</Label>
          <Input
            id="tx"
            className="bg-canvas tabular"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note">Note (optional)</Label>
          <Input
            id="note"
            className="bg-canvas"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. sent from Binance withdrawal"
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

      {showHistory && history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Recent submissions</h4>
          <ul className="mt-2 space-y-2">
            {history.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm"
              >
                <span className="tabular font-medium">
                  {formatUsd(p.amount_usd)} {formatRail(p.currency)}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                    p.status === "confirmed" && "bg-teal/15 text-teal",
                    p.status === "rejected" && "bg-hotpink/15 text-hotpink",
                    p.status === "pending_review" && "bg-orange/15 text-ink"
                  )}
                >
                  {p.status.replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
