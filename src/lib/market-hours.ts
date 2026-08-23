/** Typical FX/gold session: Sunday 22:00 UTC → Friday 22:00 UTC. */

export type MarketStatus = {
  open: boolean;
  /** Short badge label: Live | Closed | Opens in … */
  label: string;
  /** Longer helper text */
  detail: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/** Next Sunday 22:00 UTC from `now` (or today if still before that). */
function nextSundayOpen(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  let add = (7 - day) % 7;
  const candidate = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + add, 22, 0, 0)
  );
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 7);
  }
  return candidate;
}

export function isForexMarketOpen(now = new Date()): boolean {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const cutoff = 22 * 60;
  if (day === 6) return false;
  if (day === 0) return minutes >= cutoff;
  if (day === 5) return minutes < cutoff;
  return true;
}

export function getMarketStatus(now = new Date()): MarketStatus {
  if (isForexMarketOpen(now)) {
    return {
      open: true,
      label: "Live",
      detail: "XAUUSD market is open",
    };
  }

  const opensAt = nextSundayOpen(now);
  // Friday after 22:00 → opens Sunday 22:00
  // Saturday → Sunday 22:00
  // Sunday before 22:00 → today 22:00
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let target = opensAt;
  if (day === 0 && minutes < 22 * 60) {
    target = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 22, 0, 0)
    );
  }

  const until = formatDuration(target.getTime() - now.getTime());
  const clock = `${pad(target.getUTCHours())}:${pad(target.getUTCMinutes())} UTC`;

  return {
    open: false,
    label: `Opens in ${until}`,
    detail: `Market closed · opens ${clock}`,
  };
}
