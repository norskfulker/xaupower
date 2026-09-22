"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Loader2 } from "lucide-react";
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
import { CopyButton } from "@/components/ui/copy-button";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DepositAddress } from "@/lib/types";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";
import {
  ASSET_LABEL,
  CHAIN_LABEL,
  RAIL_ASSET,
  RAIL_CHAIN,
  assetsFromRails,
  chainsForAsset,
  formatRail,
  railNetwork,
  railsForNetworks,
  toRail,
  type AssetSymbol,
  type ChainId,
  type PaymentRail,
} from "@/lib/wallets";

const ASSET_LOGO: Record<AssetSymbol, string> = {
  BTC: "₿",
  ETH: "Ξ",
  BNB: "Ⓑ",
  TRX: "Ⓣ",
  USDT: "₮",
  USDC: "Ⓒ",
};

const ASSET_COLOR: Record<AssetSymbol, string> = {
  BTC: "bg-orange/15 text-orange",
  ETH: "bg-ink/10 text-ink",
  BNB: "bg-gold/20 text-gold",
  TRX: "bg-hotpink/15 text-hotpink",
  USDT: "bg-teal/15 text-teal",
  USDC: "bg-ink/10 text-ink",
};

export function CryptoDepositMethods({
  depositAddresses,
  currency,
  onCurrencyChange,
  amountDue,
  txHash,
  onTxHashChange,
  note,
  onNoteChange,
  error,
  loading,
  onSubmit,
  submitLabel = "Submit",
}: {
  depositAddresses: DepositAddress[];
  currency: PaymentRail;
  onCurrencyChange: (rail: PaymentRail) => void;
  amountDue: number;
  txHash: string;
  onTxHashChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  error?: string | null;
  loading?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
}) {
  const activeAddresses = useMemo(
    () => depositAddresses.filter((d) => d.is_active),
    [depositAddresses]
  );
  const availableRails = useMemo(
    () => railsForNetworks(activeAddresses.map((d) => d.currency)),
    [activeAddresses]
  );
  const assets = useMemo(
    () => assetsFromRails(availableRails),
    [availableRails]
  );

  // Default selections so the QR is shown immediately.
  const currentAsset: AssetSymbol = RAIL_ASSET[currency];
  const chainsForCurrentAsset = useMemo(
    () => chainsForAsset(currentAsset, availableRails),
    [currentAsset, availableRails]
  );

  const [selectedAsset, setSelectedAsset] = useState<AssetSymbol>(currentAsset);
  const initialChain: ChainId =
    chainsForCurrentAsset.includes(RAIL_CHAIN[currency])
      ? RAIL_CHAIN[currency]
      : chainsForCurrentAsset[0] ?? "ERC20";
  const [selectedChain, setSelectedChain] = useState<ChainId>(initialChain);

  const activeRail: PaymentRail =
    toRail(selectedAsset, selectedChain) ?? currency;

  const addressForRail = activeAddresses.find(
    (d) => d.currency === railNetwork(activeRail)
  );

  // Keep the form's authoritative rail in sync.
  function commitAsset(next: AssetSymbol) {
    setSelectedAsset(next);
    const chains = chainsForAsset(next, availableRails);
    const target = chains.includes(selectedChain)
      ? selectedChain
      : chains[0];
    if (target) {
      setSelectedChain(target);
      const rail = toRail(next, target);
      if (rail) onCurrencyChange(rail);
    }
  }

  function commitChain(next: ChainId) {
    setSelectedChain(next);
    const rail = toRail(selectedAsset, next);
    if (rail) onCurrencyChange(rail);
  }

if (assets.length === 0) {
    return (
      <p className="text-sm text-hotpink">
        No deposit methods are configured yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-ink">Pay with crypto</p>

      {/* Asset picker (one selection per asset; cannot collapse). */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {assets.map((asset) => {
          const active = asset === selectedAsset;
          return (
            <button
              key={asset}
              type="button"
              onClick={() => commitAsset(asset)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition",
                active
                  ? "border-orange bg-orange/10 ring-2 ring-orange"
                  : "border-border bg-card hover:border-orange/40"
              )}
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-base font-bold",
                  ASSET_COLOR[asset]
                )}
              >
                {ASSET_LOGO[asset]}
              </span>
              <span
                className={cn(
                  "text-sm font-bold",
                  active ? "text-orange" : "text-ink"
                )}
              >
                {ASSET_LABEL[asset]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Network dropdown — only when there's more than one chain for this asset. */}
      {chainsForCurrentAsset.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor="rail-network">Network</Label>
          <Select
            value={selectedChain}
            onValueChange={(value) => {
              if (value) commitChain(value as ChainId);
            }}
          >
            <SelectTrigger id="rail-network">
              <SelectValue placeholder="Choose network">
                {CHAIN_LABEL[selectedChain]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {chainsForCurrentAsset.map((chain) => (
                <SelectItem key={chain} value={chain}>
                  {CHAIN_LABEL[chain]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* QR + address */}
      {addressForRail ? (
        <div className="rounded-2xl border border-border bg-canvas p-4 sm:p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <div className="rounded-xl bg-white p-2 shadow-card">
              <QRCodeSVG value={addressForRail.address} size={140} />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-center gap-1">
                <p className="font-display text-2xl tabular text-ink">
                  {formatUsd(amountDue)}
                </p>
                <CopyButton
                  value={formatUsd(amountDue)}
                  label="Copy amount"
                />
              </div>
              <div className="flex items-start gap-2">
                <code className="flex-1 break-all text-sm tabular text-ink">
                  {addressForRail.address}
                </code>
                <CopyButton
                  value={addressForRail.address}
                  label="Copy address"
                />
              </div>
              {addressForRail.address.startsWith(
                PLACEHOLDER_DEPOSIT_PREFIX
              ) && (
                <p className="text-xs text-hotpink">
                  Placeholder address — replace before going live.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-hotpink">
          No active {railNetwork(activeRail)} deposit address. Contact
          support.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="tx-hash">Transaction hash</Label>
        <Input
          id="tx-hash"
          className="bg-white tabular"
          value={txHash}
          onChange={(e) => onTxHashChange(e.target.value)}
          placeholder="Paste tx hash"
          required
        />
      </div>
      <Input
        className="bg-white"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="Note (optional)"
      />

      <p className="text-xs text-muted-label">
        Send only {formatRail(activeRail)} to this address.
      </p>

      {error && <p className="text-sm text-hotpink">{error}</p>}
      <Button
        className="w-full bg-orange text-white hover:bg-orange/90"
        disabled={loading || !addressForRail}
        onClick={onSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" /> Submitting
          </>
        ) : (
          <>{submitLabel}</>
        )}
      </Button>
    </div>
  );
}
