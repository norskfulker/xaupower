import type { CryptoCurrency } from "@/lib/types";

export function validateCryptoAddress(
  currency: CryptoCurrency,
  address: string
): string | null {
  const a = address.trim();
  if (!a) return "Enter a destination address";

  if (currency === "BTC") {
    if (!/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(a)) {
      return "BTC address format looks invalid";
    }
  } else if (currency === "ETH") {
    if (!/^0x[a-fA-F0-9]{40}$/.test(a)) {
      return "ETH address must start with 0x and be 42 characters";
    }
  } else if (currency === "USDT") {
    // TRC20 (T…) or ERC20 (0x…)
    const ok =
      /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a) || /^0x[a-fA-F0-9]{40}$/.test(a);
    if (!ok) {
      return "USDT address should be TRC20 (T…) or ERC20 (0x…)";
    }
  }

  return null;
}
