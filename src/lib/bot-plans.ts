import type { PackageName, PackageVariant, RiskTier } from "@/lib/types";

export type BotPlanSpec = {
  minDeposit: number;
  timeline: string;
  tradesPerDay: number;
  strategy: string;
  drawdownPct: number;
  maxLossPct: number;
  riskTier: RiskTier;
};

export const BOT_PLAN_SPECS: Record<PackageName, BotPlanSpec> = {
  Assay: {
    minDeposit: 99,
    timeline: "3 weeks",
    tradesPerDay: 7,
    strategy: "Nominal",
    drawdownPct: 5,
    maxLossPct: 30,
    riskTier: "conservative",
  },
  Bullion: {
    minDeposit: 399,
    timeline: "3 weeks",
    tradesPerDay: 20,
    strategy: "Conservative",
    drawdownPct: 8,
    maxLossPct: 40,
    riskTier: "standard",
  },
  Vault: {
    minDeposit: 999,
    timeline: "3 weeks",
    tradesPerDay: 40,
    strategy: "Aggressive",
    drawdownPct: 15,
    maxLossPct: 50,
    riskTier: "aggressive",
  },
};

export function getVariantForPackage(
  packageName: PackageName,
  packageId: string,
  variants: PackageVariant[]
): PackageVariant | null {
  const spec = BOT_PLAN_SPECS[packageName];
  return (
    variants.find(
      (v) => v.package_id === packageId && v.risk_tier === spec.riskTier
    ) ??
    variants.find((v) => v.package_id === packageId) ??
    null
  );
}

export function planSpecLines(name: PackageName): string[] {
  const s = BOT_PLAN_SPECS[name];
  return [
    `${formatUsdInteger(s.minDeposit)} min deposit`,
    `${s.timeline} timeline`,
    `${s.tradesPerDay} trades a day`,
    `${s.strategy} strategy`,
    `${s.drawdownPct}% drawdown`,
    `Max loss ${s.maxLossPct}%`,
  ];
}

function formatUsdInteger(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}
