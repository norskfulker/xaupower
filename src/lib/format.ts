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

export const PLAN_ACCESS_TERM = "3 weeks";
export const PLAN_ACCESS_DAYS = 21;

export const DAILY_RETURN_RANGE: Record<
  "Assay" | "Bullion" | "Vault",
  { min: number; max: number }
> = {
  Assay: { min: 5, max: 8 },
  Bullion: { min: 6, max: 12 },
  Vault: { min: 7, max: 14 },
};

export function dailyReturnLabel(name: "Assay" | "Bullion" | "Vault"): string {
  const range = DAILY_RETURN_RANGE[name];
  return `${range.min}–${range.max}% daily`;
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
    package: "VPS bot setup",
    balance: "Bot trading balance",
    signal: "Signals (legacy)",
  };

export const PAYMENT_KIND_BLURB: Record<"package" | "balance" | "signal", string> =
  {
    package:
      "Setup fee. After approval we provision the VPS bot. Trading capital is a separate deposit.",
    balance:
      "Trading capital the VPS bot uses. After approval it credits the user wallet and can be paid out later.",
    signal: "Legacy signal purchases — no longer offered.",
  };
