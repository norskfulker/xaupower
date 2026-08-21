import type {
  Package,
  PackageVariant,
  RiskTier,
  RoadmapStep,
  UserPackage,
  VariantSnapshot,
} from "@/lib/types";
import { RISK_LABEL } from "@/lib/format";

function asSnapshot(value: unknown): VariantSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const risk = row.risk_tier;
  if (risk !== "conservative" && risk !== "standard" && risk !== "aggressive") {
    return null;
  }
  const name = String(row.package_name ?? "");
  if (!name) return null;
  return {
    id: String(row.id ?? ""),
    package_id: String(row.package_id ?? ""),
    package_name: name,
    risk_tier: risk as RiskTier,
    price_usd: Number(row.price_usd ?? 0),
    max_lot_size: Number(row.max_lot_size ?? 0),
    profit_target_pct: Number(row.profit_target_pct ?? 0),
    max_drawdown_pct: Number(row.max_drawdown_pct ?? 0),
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
    price_usd: Number(live.price_usd),
    max_lot_size: Number(live.max_lot_size),
    profit_target_pct: Number(live.profit_target_pct),
    max_drawdown_pct: Number(live.max_drawdown_pct),
    roadmap: Array.isArray(live.roadmap) ? live.roadmap : [],
  };
}

export function packageDisplayLabel(
  terms: VariantSnapshot | null
): string | null {
  if (!terms) return null;
  return `${terms.package_name} ${RISK_LABEL[terms.risk_tier]}`;
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
