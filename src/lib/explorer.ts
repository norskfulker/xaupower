import type { CryptoCurrency } from "@/lib/wallets";
import { railNetwork } from "@/lib/wallets";

export function explorerTxUrl(
  currency: CryptoCurrency,
  txHash: string
): string | null {
  const hash = txHash.trim();
  if (!hash) return null;
  if (currency === "BTC") {
    return `https://blockchair.com/bitcoin/transaction/${hash}`;
  }
  if (
    currency === "BNB" ||
    currency === "USDT_BEP20" ||
    currency === "USDC_BEP20"
  ) {
    return `https://bscscan.com/tx/${hash}`;
  }
  if (railNetwork(currency) === "TRC20") {
    return `https://tronscan.org/#/transaction/${hash}`;
  }
  return `https://etherscan.io/tx/${hash}`;
}
