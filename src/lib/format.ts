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

export function planFeatureBullets(features: string[] | null | undefined): string[] {
  return (features ?? []).filter(
    (feature) =>
      !/3-week|daily return|credited at 03:00/i.test(feature)
  );
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

export const WEEKLY_PROFIT_PCT: Record<
  "conservative" | "standard" | "aggressive",
  number
> = {
  conservative: 25,
  standard: 50,
  aggressive: 100,
};

export const PAYMENT_KIND_LABEL: Record<"package" | "balance" | "signal", string> =
  {
    package: "New bot purchase",
    balance: "Add funds to bot",
    signal: "Signals (legacy)",
  };

export const PAYMENT_KIND_BLURB: Record<"package" | "balance" | "signal", string> =
  {
    package: "Starts a new bot after approval.",
    balance: "Adds to the selected bot after approval.",
    signal: "Legacy signal purchases — no longer offered.",
  };
