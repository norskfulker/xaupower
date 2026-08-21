import type { CryptoCurrency, WalletNetwork } from "@/lib/wallets";
import { railNetwork } from "@/lib/wallets";

export function validateWalletAddress(
  network: WalletNetwork,
  address: string
): string | null {
  const a = address.trim();
  if (!a) return "Enter an address";

  if (network === "BTC") {
    if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a)) {
      return "BTC address format looks invalid";
    }
  } else if (network === "ERC20") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
      return "ERC20 / BEP20 address must start with 0x and be 42 characters";
    }
  } else if (network === "TRC20") {
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) {
      return "TRC20 address should start with T (Tron)";
    }
  }

  return null;
}

export function validateCryptoAddress(
  currency: CryptoCurrency,
  address: string
): string | null {
  return validateWalletAddress(railNetwork(currency), address);
}
