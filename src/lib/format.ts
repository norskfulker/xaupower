export function formatUsd(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Whole-dollar display for bot plan prices. */
export function formatUsdInteger(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? Math.round(n) : 0);
}

export function formatPrice(value: number | string | null | undefined, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(n) ? n : 0);
}

export function daysRemaining(expiresAt: string | null | undefined): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function accessElapsedPct(
  startAt: string | null | undefined,
  expiresAt: string | null | undefined
): number {
  if (!startAt || !expiresAt) return 0;
  const start = new Date(startAt).getTime();
  const end = new Date(expiresAt).getTime();
  const span = Math.max(end - start, 1);
  return Math.min(100, Math.max(0, ((Date.now() - start) / span) * 100));
}

export const RISK_LABEL: Record<
  "conservative" | "standard" | "aggressive",
  string
> = {
  conservative: "Nominal",
  standard: "Standard",
  aggressive: "Aggressive",
};

/** Daily return %, used by the account daily-return credit function. */
export const DAILY_RETURN_PCT: Record<
  "conservative" | "standard" | "aggressive",
  number
> = {
  conservative: 0.8,
  standard: 1.2,
  aggressive: 1.8,
};

export const PAYMENT_KIND_LABEL: Record<"deposit" | "withdrawal" | "transfer", string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transfer: "Transfer",
};

export const PAYMENT_KIND_BLURB: Record<"deposit" | "withdrawal" | "transfer", string> = {
  deposit: "Add funds to an account.",
  withdrawal: "Send funds out of an account.",
  transfer: "Move funds between accounts or users.",
};

export const ACCOUNT_STATUS_LABEL: Record<"active" | "expired" | "draining", string> = {
  active: "Active",
  expired: "Expired",
  draining: "Draining",
};

export const TRANSFER_STATUS_LABEL: Record<"pending" | "completed" | "rejected" | "expired", string> = {
  pending: "Awaiting recipient",
  completed: "Completed",
  rejected: "Rejected",
  expired: "Expired",
};

/** Tier-specific target/max-drawdown for an account's bot. These mirror the
 *  values that were on package_variants previously and are now just config. */
export const ACCOUNT_RISK_CONFIG: Record<
  "conservative" | "standard" | "aggressive",
  { profitTargetPct: number; maxDrawdownPct: number }
> = {
  conservative: { profitTargetPct: 5, maxDrawdownPct: 30 },
  standard: { profitTargetPct: 8, maxDrawdownPct: 40 },
  aggressive: { profitTargetPct: 12, maxDrawdownPct: 50 },
};