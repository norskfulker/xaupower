import type { CryptoCurrency, WalletNetwork } from "@/lib/wallets";
import { railNetwork } from "@/lib/wallets";

/** BTC: Legacy P2PKH/P2SH (1…/3…) or Bech32 (bc1…). */
const BTC_RE = /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/;

/** ERC20 / BEP20: Ethereum-style 0x + 40 hex chars (42 total). */
const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

/** TRC20: Tron Base58Check address starting with T (34 chars). */
const TRC20_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

export function validateWalletAddress(
  network: WalletNetwork,
  address: string
): string | null {
  const a = address.trim();
  if (!a) return "Enter an address";

  if (network === "BTC") {
    if (!BTC_RE.test(a)) {
      return "Invalid BTC address. Use a Bitcoin address starting with 1, 3, or bc1.";
    }
  } else if (network === "ERC20") {
    // Same 0x format for ERC20 (Ethereum) and BEP20 (BNB Smart Chain)
    if (!EVM_RE.test(a)) {
      return "Invalid ERC20 / BEP20 address. Must start with 0x and be 42 characters.";
    }
  } else if (network === "TRC20") {
    if (!TRC20_RE.test(a)) {
      return "Invalid TRC20 address. Use a Tron address starting with T (34 characters).";
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

/** Human label for the network being validated. */
export function addressNetworkHint(currency: CryptoCurrency): string {
  const network = railNetwork(currency);
  if (network === "BTC") return "BTC · Bitcoin";
  if (network === "TRC20") return "TRC20 · Tron";
  return "ERC20 / BEP20 · 0x address";
}

export function isValidCryptoAddress(
  currency: CryptoCurrency,
  address: string
): boolean {
  return (
    validateCryptoAddress(currency, address) == null && address.trim().length > 0
  );
}
