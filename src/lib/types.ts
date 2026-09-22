export type UserRole = "user" | "admin";

export type RiskTier = "conservative" | "standard" | "aggressive";
export type AccountStatus = "active" | "expired" | "draining";

export type PaymentKind = "deposit" | "withdrawal" | "transfer";
export type PaymentStatus = "pending_review" | "confirmed" | "rejected" | "cancelled";
export type PayoutStatus =
  | "requested"
  | "pending_review"
  | "processing"
  | "sent"
  | "rejected"
  | "failed";
export type TransferStatus = "pending" | "completed" | "rejected" | "expired";
export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "transfer_out"
  | "transfer_in"
  | "daily_return";

export type SignalPair = "XAUUSD" | "XAGUSD"; // XAGUSD kept for historical rows only
export type SignalDirection = "long" | "short";
export type SignalStatus = "open" | "closed" | "cancelled";

export type WalletNetwork = import("@/lib/wallets").WalletNetwork;
export type CryptoCurrency = import("@/lib/wallets").CryptoCurrency;

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

/**
 * Account = a user's sub-wallet running a gold-trading bot.
 * Created via `create_account(risk_tier)`. The deposit amount determines the
 * bot's capital; the user picks the risk tier when the account is created.
 *
 * `leverage` and `execution_type` are user-facing knobs that look like they
 * control the bot but don't affect any actual trading logic — they're
 * captured to make the UX feel responsive. Stored on the account so they
 * survive across sessions.
 */
export interface Account {
  id: string;
  user_id: string;
  account_code: string;
  name: string;
  risk_tier: RiskTier;
  status: AccountStatus;
  available_usd: number;
  pending_usd: number;
  capital_usd: number;
  leverage: number;
  execution_type: "market" | "instant";
  purchased_at: string;
  expires_at: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  account_id: string;
  kind: PaymentKind;
  currency: CryptoCurrency;
  amount_usd: number;
  status: PaymentStatus;
  tx_hash: string | null;
  user_note: string | null;
  admin_note: string | null;
  created_at: string;
  submitted_at: string | null;
  confirmed_at: string | null;
  nowpayments_payment_id: string | null;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
}

export interface Payout {
  id: string;
  user_id: string;
  account_id: string;
  amount_usd: number;
  currency: CryptoCurrency;
  destination_address: string;
  status: PayoutStatus;
  nowpayments_payout_id: string | null;
  tx_hash: string | null;
  admin_note: string | null;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
}

export interface Transfer {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_account_id: string | null;
  to_account_id: string | null;
  amount_usd: number;
  currency: CryptoCurrency;
  status: TransferStatus;
  confirm_token?: string | null;
  expires_at: string;
  confirmed_at: string | null;
  created_at: string;
  note: string | null;
}

export interface LedgerTransaction {
  id: string;
  user_id: string;
  account_id: string | null;
  type: TransactionType;
  amount_usd: number;
  reference_table: string | null;
  reference_id: string | null;
  paired_transaction_id: string | null;
  description: string;
  created_at: string;
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

export interface DepositAddress {
  id: string;
  currency: WalletNetwork;
  address: string;
  is_active: boolean;
  updated_at: string;
}

export interface ReferralLeaderboardRow {
  user_id: string;
  display_name: string | null;
  referral_code: string | null;
  referred_count: number;
  total_deposits: number;
}

export const PLACEHOLDER_DEPOSIT_PREFIX = "PLACEHOLDER_";
export const MIN_DEPOSIT_USD = 10;
export const MIN_WITHDRAWAL_USD = 10;
export const MAX_DEPOSIT_USD = 10_000_000;
export const TRANSFER_CONFIRMATION_HOURS = 2;
export const TRADINGVIEW_CHART_URL =
  "https://www.tradingview.com/chart/?symbol=OANDA:XAUUSD";