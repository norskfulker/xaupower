import type {
  Package,
  PackageVariant,
  RiskTier,
  RoadmapStep,
  UserPackage,
  VariantSnapshot,
} from "@/lib/types";

function asSnapshot(value: unknown): VariantSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const name = String(row.package_name ?? "");
  if (!name) return null;
  const risk = row.risk_tier;
  const riskTier =
    risk === "conservative" || risk === "standard" || risk === "aggressive"
      ? (risk as RiskTier)
      : ("standard" as RiskTier);
  return {
    id: String(row.id ?? ""),
    package_id: String(row.package_id ?? ""),
    package_name: name,
    risk_tier: riskTier,
    strategy_label:
      typeof row.strategy_label === "string" ? row.strategy_label : undefined,
    price_usd: Number(row.price_usd ?? 0),
    max_lot_size: Number(row.max_lot_size ?? 0),
    profit_target_pct: Number(row.profit_target_pct ?? 0),
    max_drawdown_pct: Number(row.max_drawdown_pct ?? 0),
    access_term_days:
      row.access_term_days != null ? Number(row.access_term_days) : undefined,
    daily_return_min_pct:
      row.daily_return_min_pct != null
        ? Number(row.daily_return_min_pct)
        : undefined,
    daily_return_max_pct:
      row.daily_return_max_pct != null
        ? Number(row.daily_return_max_pct)
        : undefined,
    roadmap: Array.isArray(row.roadmap) ? (row.roadmap as RoadmapStep[]) : [],
  };
}

export function resolveUserPackageTerms(
  row: Pick<UserPackage, "variant_snapshot" | "package_variants">
): VariantSnapshot | null {
  const frozen = asSnapshot(row.variant_snapshot);
  if (frozen) return frozen;

  const live = row.package_variants as
    | (PackageVariant & { packages?: Package })
    | undefined;
  if (!live) return null;
  return {
    id: live.id,
    package_id: live.package_id,
    package_name: live.packages?.name ?? "Package",
    risk_tier: live.risk_tier,
    strategy_label: live.strategy_label,
    price_usd: Number(live.price_usd),
    max_lot_size: Number(live.max_lot_size),
    profit_target_pct: Number(live.profit_target_pct),
    max_drawdown_pct: Number(live.max_drawdown_pct),
    access_term_days: live.packages?.access_term_days ?? undefined,
    daily_return_min_pct: live.packages?.daily_return_min_pct ?? undefined,
    daily_return_max_pct: live.packages?.daily_return_max_pct ?? undefined,
    roadmap: Array.isArray(live.roadmap) ? live.roadmap : [],
  };
}

export function packageDisplayLabel(
  terms: VariantSnapshot | null
): string | null {
  if (!terms) return null;
  const strategy = terms.strategy_label?.trim();
  if (strategy) return `${terms.package_name} ${strategy}`;
  return terms.package_name;
}

export function paymentPackageLabel(row: {
  variant_snapshot?: VariantSnapshot | null;
  package_variants?: PackageVariant & { packages?: Package };
}): string | null {
  return packageDisplayLabel(
    resolveUserPackageTerms({
      variant_snapshot: row.variant_snapshot,
      package_variants: row.package_variants,
    })
  );
}
