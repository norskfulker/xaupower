/** Typical FX session: Sunday 22:00 UTC \u2192 Friday 22:00 UTC. Ambient only. */
export function isForexMarketOpen(now = new Date()): boolean {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const cutoff = 22 * 60;
  if (day === 6) return false;
  if (day === 0) return minutes >= cutoff;
  if (day === 5) return minutes < cutoff;
  return true;
}
