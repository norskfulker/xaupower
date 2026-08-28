"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_LABEL,
  CHAIN_LABEL,
  RAIL_ASSET,
  RAIL_CHAIN,
  assetsFromRails,
  chainsForAsset,
  toRail,
  type AssetSymbol,
  type ChainId,
  type PaymentRail,
} from "@/lib/wallets";

export function CurrencyNetworkFields({
  rail,
  rails,
  onChange,
  triggerClassName = "w-full h-11 rounded-md border-border bg-canvas px-3.5",
}: {
  rail: PaymentRail;
  rails: PaymentRail[];
  onChange: (rail: PaymentRail) => void;
  triggerClassName?: string;
}) {
  const asset = RAIL_ASSET[rail];
  const chain = RAIL_CHAIN[rail];
  const assets = assetsFromRails(rails);
  const chains = chainsForAsset(asset, rails);

  function setAsset(next: AssetSymbol) {
    const nextChains = chainsForAsset(next, rails);
    const keep = nextChains.includes(chain) ? chain : nextChains[0];
    const found = keep ? toRail(next, keep) : null;
    if (found) onChange(found);
  }

  function setChain(next: ChainId) {
    const found = toRail(asset, next);
    if (found) onChange(found);
  }

  return (
    <>
      <div className="space-y-2">
        <Label>Currency</Label>
        <Select
          value={asset}
          onValueChange={(v) => v && setAsset(v as AssetSymbol)}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {assets.map((item) => (
              <SelectItem key={item} value={item}>
                {ASSET_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Network</Label>
        <Select
          value={chain}
          onValueChange={(v) => v && setChain(v as ChainId)}
        >
          <SelectTrigger className={triggerClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {chains.map((item) => (
              <SelectItem key={item} value={item}>
                {CHAIN_LABEL[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {asset === "USDT" || asset === "USDC" ? (
          <p className="text-xs text-muted-label">
          </p>
        ) : null}
      </div>
    </>
  );
}
