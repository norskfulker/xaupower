import { formatUsdInteger } from "@/lib/format";
import type { Package, PackageVariant } from "@/lib/types";

export function getDefaultVariant(
  packageId: string,
  variants: PackageVariant[]
): PackageVariant | null {
  const forPkg = variants.filter((v) => v.package_id === packageId);
  return forPkg.find((v) => v.is_default) ?? forPkg[0] ?? null;
}

export function formatAccessTerm(pkg: Pick<Package, "access_term_days">): string {
  const days = Number(pkg.access_term_days ?? 21);
  if (days === 21) return "3 weeks";
  if (days === 7) return "1 week";
  if (days % 7 === 0) return `${days / 7} weeks`;
  return `${days} days`;
}

export function planSpecLines(
  pkg: Package,
  variant: PackageVariant | null
): string[] {
  const lines: string[] = [];
  lines.push(`${formatUsdInteger(pkg.price_usd)} min deposit`);
  lines.push(`${formatAccessTerm(pkg)} timeline`);
  if (pkg.trades_per_day != null && pkg.trades_per_day > 0) {
    lines.push(`${pkg.trades_per_day} trades a day`);
  }
  const strategy = variant?.strategy_label?.trim();
  if (strategy) lines.push(`${strategy} strategy`);
  if (variant && Number.isFinite(Number(variant.max_drawdown_pct))) {
    lines.push(`${variant.max_drawdown_pct}% drawdown`);
  }
  if (
    pkg.daily_return_min_pct != null &&
    pkg.daily_return_max_pct != null
  ) {
    const min = Number(pkg.daily_return_min_pct);
    const max = Number(pkg.daily_return_max_pct);
    const minLabel = min > 0 ? `+${min}` : `${min}`;
    const maxLabel = max > 0 ? `+${max}` : `${max}`;
    lines.push(`Daily P&L ${minLabel}% to ${maxLabel}%`);
  } else if (pkg.max_loss_pct != null && Number(pkg.max_loss_pct) > 0) {
    lines.push(`Max loss ${pkg.max_loss_pct}%`);
  }
  return lines;
}

export function displayStrategyLabel(variant: PackageVariant | null): string {
  const label = variant?.strategy_label?.trim();
  return label || "Standard";
}
