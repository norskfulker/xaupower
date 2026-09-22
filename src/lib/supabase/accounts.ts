import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Account,
  LedgerTransaction,
  Payout,
  Payment,
  Transfer,
} from "@/lib/types";

export const getAccountsForUser = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("purchased_at", { ascending: false });
  return (data ?? []) as Account[];
});

export const getAccountById = cache(async (accountId: string, userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data ?? null) as Account | null;
});

export const getPaymentsForUser = cache(async (userId: string, limit = 40) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Payment[];
});

export const getPayoutsForUser = cache(async (userId: string, limit = 40) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payouts")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Payout[];
});

export const getTransfersForUser = cache(async (userId: string, limit = 40) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transfers")
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Transfer[];
});

export const getTransactionsForUser = cache(async (userId: string, limit = 200) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LedgerTransaction[];
});

export const getReferralLeaderboard = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_leaderboard")
    .select("user_id, display_name, referral_code, referred_count, total_deposits")
    .order("total_deposits", { ascending: false })
    .limit(10);
  return (data ?? []) as {
    user_id: string;
    display_name: string | null;
    referral_code: string | null;
    referred_count: number;
    total_deposits: number;
  }[];
});

export async function getAggregateBalances(userId: string) {
  const accounts = await getAccountsForUser(userId);
  let available = 0;
  let pending = 0;
  let capital = 0;
  for (const a of accounts) {
    available += Number(a.available_usd ?? 0);
    pending += Number(a.pending_usd ?? 0);
    capital += Number(a.capital_usd ?? 0);
  }
  return { accounts, available, pending, capital };
}
