export const PRICE_POLL_MINUTES = 5;
export const PRICE_STALE_AFTER_MS = PRICE_POLL_MINUTES * 2 * 60 * 1000;

export type PricePair = "XAUUSD";

export interface PriceQuote {
  pair: PricePair;
  price: number;
  change_pct: number | null;
  fetched_at: string;
}

export function isPriceStale(fetchedAt: string, now = Date.now()): boolean {
  const t = new Date(fetchedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now - t > PRICE_STALE_AFTER_MS;
}

export function formatAsOf(fetchedAt: string): string {
  const d = new Date(fetchedAt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
