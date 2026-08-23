export type UserRole = "user" | "admin";
export type PackageName = "Assay" | "Bullion" | "Vault";
export type UserPackageStatus = "pending" | "active" | "expired";
export type WalletNetwork = import("@/lib/wallets").WalletNetwork;
export type CryptoCurrency = import("@/lib/wallets").CryptoCurrency;
export type RiskTier = "conservative" | "standard" | "aggressive";
export type PaymentStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "partially_paid"
  | "failed"
  | "expired"
  | "pending_review"
  | "rejected";
export type PayoutStatus =
  | "requested"
  | "pending_review"
  | "processing"
  | "sent"
  | "rejected"
  | "failed";
export type SignalPair = "XAUUSD" | "XAGUSD"; // XAGUSD kept for historical rows only
export type SignalDirection = "long" | "short";
export type SignalStatus = "open" | "closed" | "cancelled";
export type PaymentKind = "package" | "balance" | "signal";
export type TransactionType =
  | "deposit"
  | "payout"
  | "package_purchase"
  | "signal_settlement";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  phone: string | null;
  notification_preferences: NotificationPreferences;
  created_at: string;
}

export interface NotificationPreferences {
  email_deposits: boolean;
  email_payouts: boolean;
}

export interface SavedPayoutAddress {
  id: string;
  user_id: string;
  currency: CryptoCurrency;
  address: string;
  label: string;
  is_primary: boolean;
  created_at: string;
}

export interface Package {
  id: string;
  name: PackageName;
  price_usd: number;
  tagline: string;
  features: string[];
  is_featured: boolean;
  is_active: boolean;
}

export interface RoadmapStep {
  step: number;
  label: string;
}

export interface PackageVariant {
  id: string;
  package_id: string;
  risk_tier: RiskTier;
  price_usd: number;
  max_lot_size: number;
  profit_target_pct: number;
  max_drawdown_pct: number;
  roadmap: RoadmapStep[];
  packages?: Package;
}

export interface VariantSnapshot {
  id: string;
  package_id: string;
  package_name: string;
  risk_tier: RiskTier;
  price_usd: number;
  max_lot_size: number;
  profit_target_pct: number;
  max_drawdown_pct: number;
  roadmap: RoadmapStep[];
}

export interface UserPackage {
  id: string;
  user_id: string;
  package_variant_id: string;
  status: UserPackageStatus;
  purchased_at: string | null;
  expires_at: string | null;
  variant_snapshot?: VariantSnapshot | null;
  package_variants?: PackageVariant & { packages?: Package };
}

export interface Payment {
  id: string;
  user_id: string;
  kind: PaymentKind;
  package_variant_id: string | null;
  currency: CryptoCurrency;
  amount_usd: number;
  nowpayments_payment_id: string | null;
  status: PaymentStatus;
  tx_hash: string | null;
  user_note: string | null;
  admin_note: string | null;
  submitted_at: string | null;
  created_at: string;
  confirmed_at: string | null;
  variant_snapshot?: VariantSnapshot | null;
  package_variants?: PackageVariant & { packages?: Package };
  profiles?: Pick<Profile, "email" | "full_name"> | null;
}

export interface Payout {
  id: string;
  user_id: string;
  amount_usd: number;
  currency: CryptoCurrency;
  destination_address: string;
  nowpayments_payout_id: string | null;
  status: PayoutStatus;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  tx_hash: string | null;
  admin_note: string | null;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
}

export interface WalletBalance {
  id: string;
  user_id: string;
  available_usd: number;
  pending_usd: number;
  profit_pips?: number;
  updated_at: string;
}

export interface Signal {
  id: string;
  pair: SignalPair;
  direction: SignalDirection;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  status: SignalStatus;
  pnl_usd: number | null;
  opened_at: string;
  closed_at: string | null;
  created_by: string;
}

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  value_usd: number;
  snapshot_at: string;
}

export interface DepositAddress {
  id: string;
  currency: WalletNetwork;
  address: string;
  is_active: boolean;
  updated_at: string;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount_usd: number;
  reference_table: string;
  reference_id: string;
  status_at_time: string;
  description: string;
  created_at: string;
}

export interface UserSignalAccess {
  id: string;
  user_id: string;
  status: UserPackageStatus;
  purchased_at: string;
  expires_at: string | null;
}

export const PLACEHOLDER_DEPOSIT_PREFIX = "PLACEHOLDER_";
export const SIGNAL_PRICE_USD = 49;
export const MIN_BALANCE_TOPUP_USD = 10;
export const TRADINGVIEW_CHART_URL =
  "https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD";
