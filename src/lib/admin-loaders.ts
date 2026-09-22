import type { Payment } from "@/lib/types";
import type { AdminUserRow } from "@/components/admin/users-table";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadAdminUserRows(supabase: Supabase) {
  const [paymentsRes, profilesRes, accountsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("user_id, amount_usd, status")
      .eq("status", "confirmed"),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("user_id, risk_tier, status")
      .eq("status", "active"),
  ]);

  const accountCountByUser = new Map<string, number>();
  for (const acct of accountsRes.data ?? []) {
    accountCountByUser.set(
      acct.user_id,
      (accountCountByUser.get(acct.user_id) ?? 0) + 1
    );
  }
  const depositedByUser = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    depositedByUser.set(
      p.user_id,
      (depositedByUser.get(p.user_id) ?? 0) + Number(p.amount_usd)
    );
  }

  const rows: AdminUserRow[] = (profilesRes.data ?? []).map((pr) => ({
    id: pr.id,
    email: pr.email,
    full_name: pr.full_name,
    accountCount: accountCountByUser.get(pr.id) ?? 0,
    totalDeposited: depositedByUser.get(pr.id) ?? 0,
    created_at: pr.created_at,
  }));

  return rows;
}

export async function loadAdminPayments(supabase: Supabase) {
  const { data } = await supabase
    .from("payments")
    .select("*, profiles(email, full_name)")
    .order("created_at", { ascending: false });
  return (data ?? []) as Payment[];
}

export async function loadAdminAccounts(supabase: Supabase) {
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .order("purchased_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    user_id: string;
    account_code: string;
    name: string;
    risk_tier: "conservative" | "standard" | "aggressive";
    status: "active" | "expired" | "draining";
    available_usd: number;
    pending_usd: number;
    capital_usd: number;
    purchased_at: string;
    expires_at: string | null;
  }>;
}
