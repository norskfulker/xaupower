/** Clamp a live USD input so it cannot exceed `max`. Keeps in-progress decimals like `12.`. */
export function clampUsdInput(raw: string, max: number): string {
  const value = raw.replace(/,/g, "");
  if (value === "") return "";
  if (!(max > 0)) return "";

  const limit = roundUsd(max);

  if (value === "." || value === "0.") return value;
  if (/^\d+\.$/.test(value)) {
    const head = Number(value.slice(0, -1));
    if (Number.isFinite(head) && head > limit) return stringifyUsd(limit);
    return value;
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (n < 0) return "0";
  if (n > limit) return stringifyUsd(limit);
  return value;
}

export function roundUsd(n: number): number {
  return Math.round(n * 100) / 100;
}

function stringifyUsd(n: number): string {
  const rounded = roundUsd(n);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}
