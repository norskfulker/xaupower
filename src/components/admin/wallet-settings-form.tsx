"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScannerDialog } from "@/components/qr/qr-scanner-dialog";
import type { DepositAddress, WalletNetwork } from "@/lib/types";
import { PLACEHOLDER_DEPOSIT_PREFIX } from "@/lib/types";
import { NETWORK_COVERS, NETWORK_LABEL, WALLET_NETWORKS } from "@/lib/wallets";
import { validateWalletAddress } from "@/lib/address-validation";

const NETWORK_ORDER: WalletNetwork[] = WALLET_NETWORKS;

export function WalletSettingsForm({
  initialAddresses,
}: {
  initialAddresses: DepositAddress[];
}) {
  const [rows, setRows] = useState(() =>
    NETWORK_ORDER.map(
      (network) =>
        initialAddresses.find((r) => r.currency === network) ?? {
          id: network,
          currency: network,
          address: "",
          is_active: true,
          updated_at: new Date().toISOString(),
        }
    )
  );
  const [saving, setSaving] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  const scanning = useMemo(
    () => rows.find((r) => r.id === scanId) ?? null,
    [rows, scanId]
  );

  const hasPlaceholder = rows.some((r) =>
    r.address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX)
  );

  function patch(id: string, next: Partial<DepositAddress>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }

  async function save(row: DepositAddress) {
    const address = row.address.trim();
    const invalid =
      !address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX) &&
      validateWalletAddress(row.currency, address);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(row.id);
    try {
      const res = await fetch("/api/admin/deposit-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          address,
          isActive: row.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? (data.address as DepositAddress) : r))
      );
      toast.message(`${NETWORK_LABEL[row.currency]} saved`);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Deposit wallets</h1>
        <p className="mt-1 text-sm text-ink/60">
          Maintain three networks. BTC is Bitcoin. ERC20 is the 0x address used
          for ETH, BNB, and USDT/USDC on ERC20 and BEP20. TRC20 is the Tron
          address for TRX and USDT/USDC TRC20.
        </p>
      </div>

      {hasPlaceholder && (
        <div className="rounded-xl border border-orange/40 bg-orange/10 px-4 py-3 text-sm text-orange">
          One or more addresses still use the seeded PLACEHOLDER_ values.
          Replace them with live wallet addresses before go-live.
        </div>
      )}

      <ul className="space-y-4">
        {rows.map((row) => {
          const showQr =
            row.address.trim().length > 8 &&
            !row.address.startsWith(PLACEHOLDER_DEPOSIT_PREFIX);
          return (
            <li
              key={row.id}
              className="rounded-lg border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Label className="text-ink/80">
                    {NETWORK_LABEL[row.currency]}
                  </Label>
                  <p className="mt-1 max-w-xl text-xs text-ink/40">
                    {NETWORK_COVERS[row.currency]}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-ink/70">
                  <input
                    type="checkbox"
                    checked={row.is_active}
                    onChange={(e) =>
                      patch(row.id, { is_active: e.target.checked })
                    }
                  />
                  Active for deposits
                </label>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[148px_1fr]">
                <div className="mx-auto flex size-[148px] items-center justify-center rounded-xl bg-white p-2">
                  {showQr ? (
                    <QRCodeSVG value={row.address.trim()} size={132} />
                  ) : (
                    <p className="px-2 text-center text-xs text-ink/50">
                      QR appears after you save a real address
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <Input
                    className="bg-canvas text-ink tabular"
                    value={row.address}
                    onChange={(e) => patch(row.id, { address: e.target.value })}
                    placeholder={
                      row.currency === "BTC"
                        ? "bc1…"
                        : row.currency === "TRC20"
                          ? "T…"
                          : "0x…"
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-border text-ink hover:bg-orange/10"
                      onClick={() => setScanId(row.id)}
                    >
                      <ScanLine className="size-4" />
                      Scan QR
                    </Button>
                    <Button
                      className="bg-orange text-white hover:bg-orange/90"
                      disabled={saving === row.id}
                      onClick={() => save(row)}
                    >
                      Save {row.currency}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <QrScannerDialog
        open={Boolean(scanning)}
        onOpenChange={(next) => {
          if (!next) setScanId(null);
        }}
        title={
          scanning
            ? `Scan ${NETWORK_LABEL[scanning.currency]} address`
            : "Scan QR code"
        }
        onScan={(value) => {
          if (!scanId) return;
          patch(scanId, { address: value });
          toast.message("Address filled from QR");
        }}
      />
    </div>
  );
}
