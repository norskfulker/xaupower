import type { CryptoCurrency } from "@/lib/types";

export function explorerTxUrl(
  currency: CryptoCurrency,
  txHash: string
): string | null {
  const hash = txHash.trim();
  if (!hash) return null;
  if (currency === "BTC") {
    return `https://blockchair.com/bitcoin/transaction/${hash}`;
  }
  // ETH and USDT (ERC-20 / common admin default)
  return `https://etherscan.io/tx/${hash}`;
}
