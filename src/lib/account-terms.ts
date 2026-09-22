import type { Account, RiskTier } from "@/lib/types";
import { ACCOUNT_RISK_CONFIG, RISK_LABEL } from "@/lib/format";

export interface AccountSummary {
  account: Account;
  label: string;
  riskLabel: string;
  dailyReturnPct: number;
  profitTargetPct: number;
  maxDrawdownPct: number;
}

export function summarizeAccount(account: Account): AccountSummary {
  const cfg = ACCOUNT_RISK_CONFIG[account.risk_tier];
  return {
    account,
    label: account.name || account.account_code,
    riskLabel: RISK_LABEL[account.risk_tier],
    dailyReturnPct: cfg.profitTargetPct,
    profitTargetPct: cfg.profitTargetPct,
    maxDrawdownPct: cfg.maxDrawdownPct,
  };
}

export function accountDisplayLabel(account: Pick<Account, "name" | "account_code">): string {
  return account.name || account.account_code;
}

export function accountRiskLabel(risk: RiskTier): string {
  return RISK_LABEL[risk];
}
