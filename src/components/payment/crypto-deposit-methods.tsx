"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import type { DepositAddress } from "@/lib/types";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";
import {
  ASSET_LABEL,
  CHAIN_LABEL,
  RAIL_ASSET,
  RAIL_CHAIN,
  RAIL_HINT,
  RAIL_LABEL,
  formatRail,
  railNetwork,
  railsForNetworks,
  type PaymentRail,
} from "@/lib/wallets";
import { cn } from "@/lib/utils";

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
  submitLabel = "Submit for admin review",
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
  const reduceMotion = useReducedMotion();
  const availableRails = railsForNetworks(
    depositAddresses.filter((d) => d.is_active).map((d) => d.currency)
  );
  const deposit = depositAddresses.find(
    (d) => d.currency === railNetwork(currency) && d.is_active
  );

  function copyAddress() {
    if (!deposit?.address) return;
    void navigator.clipboard.writeText(deposit.address);
    toast.message("Address copied");
  }

  function copyAmountDue() {
    void navigator.clipboard.writeText(formatUsd(amountDue));
    toast.message("Amount due copied");
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">Crypto deposit methods</p>
      <div className="space-y-2">
        {availableRails.map((rail) => {
          const open = currency === rail;
          const railDeposit = depositAddresses.find(
            (d) => d.currency === railNetwork(rail) && d.is_active
          );
          return (
            <div
              key={rail}
              className={cn(
                "overflow-hidden rounded-2xl border transition",
                open
                  ? "border-orange/40 bg-orange/5 shadow-card"
                  : "border-border bg-card hover:border-orange/30"
              )}
            >
              <button
                type="button"
                onClick={() => onCurrencyChange(rail)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span>
                  <span className="block font-display text-base text-ink">
                    {ASSET_LABEL[RAIL_ASSET[rail]]}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-label">
                    {CHAIN_LABEL[RAIL_CHAIN[rail]]} · {RAIL_LABEL[rail]}
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.2 }}
                  className="text-muted-label"
                >
                  <ChevronDown className="size-4" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    key={`${rail}-panel`}
                    initial={
                      reduceMotion ? false : { height: 0, opacity: 0 }
                    }
                    animate={{ height: "auto", opacity: 1 }}
                    exit={
                      reduceMotion ? undefined : { height: 0, opacity: 0 }
                    }
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 border-t border-border/70 px-4 pb-4 pt-3">
                      {railDeposit ? (
                        <>
                          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                            <div className="rounded-xl bg-white p-2 shadow-card">
                              <QRCodeSVG
                                value={railDeposit.address}
                                size={128}
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-3">
                              <div>
                                <p className="text-kicker">Amount due</p>
                                <div className="mt-1 flex items-center gap-1">
                                  <p className="font-display text-2xl tabular text-ink">
                                    {formatUsd(amountDue)}
                                  </p>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={copyAmountDue}
                                  >
                                    <Copy className="size-4" />
                                    <span className="sr-only">
                                      Copy amount due
                                    </span>
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <p className="text-kicker">Wallet address</p>
                                <div className="mt-1 flex items-start gap-2">
                                  <code className="flex-1 break-all text-sm tabular text-ink">
                                    {railDeposit.address}
                                  </code>
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    onClick={copyAddress}
                                  >
                                    <Copy className="size-4" />
                                    <span className="sr-only">
                                      Copy address
                                    </span>
                                  </Button>
                                </div>
                                <p className="mt-1 text-xs text-muted-label">
                                  {RAIL_HINT[rail]}
                                </p>
                                {railDeposit.address.startsWith(
                                  PLACEHOLDER_DEPOSIT_PREFIX
                                ) && (
                                  <p className="mt-2 text-xs text-hotpink">
                                    Placeholder address — confirm with support
                                    before sending funds.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`tx-${rail}`}>
                              Transaction hash
                            </Label>
                            <Input
                              id={`tx-${rail}`}
                              className="bg-white tabular"
                              value={txHash}
                              onChange={(e) => onTxHashChange(e.target.value)}
                              placeholder="Paste your tx hash"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`note-${rail}`}>
                              Note (optional)
                            </Label>
                            <Input
                              id={`note-${rail}`}
                              className="bg-white"
                              value={note}
                              onChange={(e) => onNoteChange(e.target.value)}
                              placeholder="e.g. sent from exchange"
                            />
                          </div>

                          <div className="rounded-xl bg-canvas px-3 py-2.5 text-xs text-muted-label">
                            <p className="font-semibold text-ink">
                              Important notes
                            </p>
                            <ul className="mt-1 list-disc space-y-0.5 pl-4">
                              <li>
                                Send only {formatRail(rail)} to this address.
                              </li>
                              <li>
                                Submit the hash after the transfer is sent.
                              </li>
                              <li>Admin review is required before credit.</li>
                            </ul>
                          </div>

                          {error && (
                            <p className="text-sm text-hotpink">{error}</p>
                          )}
                          <Button
                            className="w-full bg-orange text-white hover:bg-orange/90"
                            disabled={loading || !railDeposit}
                            onClick={onSubmit}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin" /> Submitting
                              </>
                            ) : (
                              <>
                                <Check className="size-4" />
                                {submitLabel}
                              </>
                            )}
                          </Button>
                        </>
                      ) : (
                        <p className="text-sm text-hotpink">
                          No active {railNetwork(rail)} deposit address. Contact
                          support.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      {availableRails.length === 0 && (
        <p className="text-sm text-hotpink">
          No deposit methods are configured yet.
        </p>
      )}
    </div>
  );
}
