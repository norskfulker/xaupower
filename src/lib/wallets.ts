export type WalletNetwork = "BTC" | "ERC20" | "TRC20";

export type PaymentRail =
  | "BTC"
  | "ETH"
  | "BNB"
  | "TRX"
  | "USDT_ERC20"
  | "USDT_BEP20"
  | "USDT_TRC20"
  | "USDC_ERC20"
  | "USDC_BEP20"
  | "USDC_TRC20";

/** Stored on payments/payouts. Includes legacy USDT from before network rails. */
export type CryptoCurrency = PaymentRail | "USDT";

export const WALLET_NETWORKS: WalletNetwork[] = ["BTC", "ERC20", "TRC20"];

export const PAYMENT_RAILS: PaymentRail[] = [
  "BTC",
  "ETH",
  "BNB",
  "USDT_ERC20",
  "USDT_BEP20",
  "USDC_ERC20",
  "USDC_BEP20",
  "TRX",
  "USDT_TRC20",
  "USDC_TRC20",
];

export const NETWORK_LABEL: Record<WalletNetwork, string> = {
  BTC: "Bitcoin",
  ERC20: "ERC20 / BEP20 (0x)",
  TRC20: "TRC20 (Tron)",
};

export const NETWORK_COVERS: Record<WalletNetwork, string> = {
  BTC: "BTC only.",
  ERC20:
    "ETH, BNB, USDT ERC20, USDT BEP20, USDC ERC20, and USDC BEP20. Same 0x address on Ethereum and BNB Smart Chain.",
  TRC20: "TRX, USDT TRC20, and USDC TRC20. Tron T… address.",
};

export type AssetSymbol = "BTC" | "ETH" | "BNB" | "TRX" | "USDT" | "USDC";
export type ChainId = "BTC" | "ERC20" | "BEP20" | "TRC20";

export const ASSET_LABEL: Record<AssetSymbol, string> = {
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BNB",
  TRX: "TRX",
  USDT: "USDT",
  USDC: "USDC",
};

export const CHAIN_LABEL: Record<ChainId, string> = {
  BTC: "Bitcoin",
  ERC20: "ERC20 · Ethereum",
  BEP20: "BEP20 · BNB Smart Chain",
  TRC20: "TRC20 · Tron",
};

export const ASSET_CHAINS: Record<AssetSymbol, ChainId[]> = {
  BTC: ["BTC"],
  ETH: ["ERC20"],
  BNB: ["BEP20"],
  TRX: ["TRC20"],
  USDT: ["ERC20", "BEP20", "TRC20"],
  USDC: ["ERC20", "BEP20", "TRC20"],
};

export const RAIL_ASSET: Record<PaymentRail, AssetSymbol> = {
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BNB",
  TRX: "TRX",
  USDT_ERC20: "USDT",
  USDT_BEP20: "USDT",
  USDT_TRC20: "USDT",
  USDC_ERC20: "USDC",
  USDC_BEP20: "USDC",
  USDC_TRC20: "USDC",
};

export const RAIL_CHAIN: Record<PaymentRail, ChainId> = {
  BTC: "BTC",
  ETH: "ERC20",
  BNB: "BEP20",
  TRX: "TRC20",
  USDT_ERC20: "ERC20",
  USDT_BEP20: "BEP20",
  USDT_TRC20: "TRC20",
  USDC_ERC20: "ERC20",
  USDC_BEP20: "BEP20",
  USDC_TRC20: "TRC20",
};

export const RAIL_LABEL: Record<PaymentRail, string> = {
  BTC: "BTC · Bitcoin",
  ETH: "ETH · ERC20",
  BNB: "BNB · BEP20",
  TRX: "TRX · TRC20",
  USDT_ERC20: "USDT · ERC20",
  USDT_BEP20: "USDT · BEP20",
  USDT_TRC20: "USDT · TRC20",
  USDC_ERC20: "USDC · ERC20",
  USDC_BEP20: "USDC · BEP20",
  USDC_TRC20: "USDC · TRC20",
};

export const RAIL_HINT: Record<PaymentRail, string> = {
  BTC: "Send BTC on Bitcoin.",
  ETH: "Send ETH on Ethereum.",
  BNB: "Send BNB on BNB Smart Chain. Uses the same 0x address as ERC20.",
  TRX: "Send TRX on Tron.",
  USDT_ERC20: "Send USDT on Ethereum (ERC20).",
  USDT_BEP20: "Send USDT on BNB Smart Chain (BEP20). Uses the same 0x address as ERC20.",
  USDT_TRC20: "Send USDT on Tron (TRC20).",
  USDC_ERC20: "Send USDC on Ethereum (ERC20).",
  USDC_BEP20: "Send USDC on BNB Smart Chain (BEP20). Uses the same 0x address as ERC20.",
  USDC_TRC20: "Send USDC on Tron (TRC20).",
};

const RAIL_NETWORK: Record<PaymentRail, WalletNetwork> = {
  BTC: "BTC",
  ETH: "ERC20",
  BNB: "ERC20",
  TRX: "TRC20",
  USDT_ERC20: "ERC20",
  USDT_BEP20: "ERC20",
  USDT_TRC20: "TRC20",
  USDC_ERC20: "ERC20",
  USDC_BEP20: "ERC20",
  USDC_TRC20: "TRC20",
};

export function isPaymentRail(value: string): value is PaymentRail {
  return (PAYMENT_RAILS as string[]).includes(value);
}

export function railNetwork(currency: CryptoCurrency): WalletNetwork {
  if (currency === "USDT") return "TRC20";
  return RAIL_NETWORK[currency];
}

export function formatRail(currency: string): string {
  if (isPaymentRail(currency)) return RAIL_LABEL[currency];
  if (currency === "USDT") return "USDT";
  return currency;
}

export function railsForNetworks(
  activeNetworks: Iterable<WalletNetwork>
): PaymentRail[] {
  const set = new Set(activeNetworks);
  return PAYMENT_RAILS.filter((rail) => set.has(RAIL_NETWORK[rail]));
}

export function firstAvailableRail(
  activeNetworks: Iterable<WalletNetwork>
): PaymentRail {
  const rails = railsForNetworks(activeNetworks);
  const preferred: PaymentRail[] = [
    "USDT_TRC20",
    "USDT_ERC20",
    "ETH",
    "BTC",
  ];
  return preferred.find((rail) => rails.includes(rail)) ?? rails[0] ?? "USDT_ERC20";
}

export function assetsFromRails(rails: PaymentRail[]): AssetSymbol[] {
  const seen = new Set<AssetSymbol>();
  const out: AssetSymbol[] = [];
  for (const rail of rails) {
    const asset = RAIL_ASSET[rail];
    if (!seen.has(asset)) {
      seen.add(asset);
      out.push(asset);
    }
  }
  return out;
}

export function chainsForAsset(
  asset: AssetSymbol,
  rails: PaymentRail[]
): ChainId[] {
  return ASSET_CHAINS[asset].filter((chain) =>
    rails.some((rail) => RAIL_ASSET[rail] === asset && RAIL_CHAIN[rail] === chain)
  );
}

export function toRail(asset: AssetSymbol, chain: ChainId): PaymentRail | null {
  return (
    PAYMENT_RAILS.find(
      (rail) => RAIL_ASSET[rail] === asset && RAIL_CHAIN[rail] === chain
    ) ?? null
  );
}
