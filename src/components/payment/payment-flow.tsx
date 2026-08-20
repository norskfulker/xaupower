"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import type {
  CryptoCurrency,
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
} from "@/lib/types";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";
import { cn } from "@/lib/utils";

type Phase = "form" | "pending" | "success" | "rejected";

export function PaymentFlow({
  packages,
  variants,
  depositAddresses,
  initialVariantId,
  initialPayments = [],
}: {
  packages: Package[];
  variants: PackageVariant[];
  depositAddresses: DepositAddress[];
  initialVariantId?: string | null;
  initialPayments?: Payment[];
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
  const [currency, setCurrency] = useState<CryptoCurrency>("USDT");
  const [txHash, setTxHash] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [history, setHistory] = useState(initialPayments);

  const variant = useMemo(
    () => variants.find((v) => v.id === variantId),
    [variants, variantId]
  );
  const pkg = packages.find((p) => p.id === variant?.package_id);
  const deposit = depositAddresses.find(
    (d) => d.currency === currency && d.is_active
  );

  useEffect(() => {
    if (initialVariantId) setVariantId(initialVariantId);
  }, [initialVariantId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("payments-user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as Payment;
            setHistory((prev) => [row, ...prev.filter((p) => p.id !== row.id)]);
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as Payment;
            setHistory((prev) =>
              prev.map((p) => (p.id === row.id ? row : p))
            );
            if (activePayment && row.id === activePayment.id) {
              setActivePayment(row);
              if (row.status === "confirmed") {
                setPhase("success");
                toast.success("Package activated");
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
  }, [activePayment]);

  function copyAddress() {
    if (!deposit?.address) return;
    void navigator.clipboard.writeText(deposit.address);
    toast.message("Address copied");
  }

  async function submit() {
    setError(null);
    if (!variantId) {
      setError("Select a package plan");
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
          packageVariantId: variantId,
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

  if (phase === "success") {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal/15">
          <Check className="size-7 text-teal" />
        </div>
        <h3 className="mt-4 text-2xl font-extrabold text-ink">Package activated</h3>
        <p className="mt-2 text-sm text-muted-label">
          Your {pkg?.name} {variant?.risk_tier} plan is now active. Signals will
          appear in your feed.
        </p>
        <Button className="mt-6" variant="outline" onClick={reset}>
          Make another deposit
        </Button>
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
              An admin will confirm the on-chain transfer before activation.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-ink">
            <span className="size-2 animate-pulse rounded-full bg-gold" />
            Pending review
          </span>
        </div>
        <div className="rounded-xl bg-canvas p-4 text-sm">
          <p className="tabular font-medium">
            {formatUsd(activePayment?.amount_usd ?? 0)} · {activePayment?.currency}
          </p>
          <p className="mt-1 break-all text-xs tabular text-muted-label">
            Tx: {activePayment?.tx_hash}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-ink">Deposit</h3>
        <p className="text-sm text-muted-label">
          Send crypto to the address below, then submit your tx hash for review.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label>Plan</Label>
          <Select value={variantId} onValueChange={(v) => v && setVariantId(v)}>
            <SelectTrigger className="w-full bg-canvas">
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => {
                const name =
                  packages.find((p) => p.id === v.package_id)?.name ?? "Package";
                return (
                  <SelectItem key={v.id} value={v.id}>
                    {name} · {v.risk_tier} · {formatUsd(v.price_usd)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
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
        <div className="space-y-2">
          <Label>Amount due</Label>
          <p className="flex h-8 items-center rounded-lg bg-canvas px-2.5 text-sm font-semibold tabular">
            {formatUsd(variant?.price_usd ?? 0)}
          </p>
        </div>
      </div>

      {deposit ? (
        <div className="grid gap-4 rounded-xl border border-border bg-canvas p-4 md:grid-cols-[140px_1fr]">
          <div className="mx-auto rounded-lg bg-white p-2">
            <QRCodeSVG value={deposit.address} size={120} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-label">
              Send to ({currency})
            </p>
            <div className="mt-1 flex items-start gap-2">
              <code className="flex-1 break-all text-sm tabular text-ink">
                {deposit.address}
              </code>
              <Button type="button" size="icon" variant="ghost" onClick={copyAddress}>
                <Copy className="size-4" />
              </Button>
            </div>
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
          No active deposit address for {currency}. Contact support.
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
            "Submit for review"
          )}
        </Button>
      </div>

      {history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Recent deposits</h4>
          <ul className="mt-2 space-y-2">
            {history.slice(0, 5).map((p) => (
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
                    p.status === "confirmed" && "bg-teal/15 text-teal",
                    p.status === "rejected" && "bg-hotpink/15 text-hotpink",
                    p.status === "pending_review" && "bg-gold/20 text-ink"
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
