import { ACCOUNT_RISK_CONFIG, RISK_LABEL } from "@/lib/format";
import type { RiskTier } from "@/lib/types";

/** Display-only helpers for the new Accounts model. */
export function getRiskConfig(tier: RiskTier) {
  return ACCOUNT_RISK_CONFIG[tier];
}

export function getRiskLabel(tier: RiskTier): string {
  return RISK_LABEL[tier];
}

/** Compatibility shim — the old `displayStrategyLabel` is gone. */
export function displayStrategyLabel(): string {
  return "Standard";
}
