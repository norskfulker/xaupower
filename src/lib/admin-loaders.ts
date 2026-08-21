import type { Payment, UserPackage } from "@/lib/types";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import type { AdminUserRow } from "@/components/admin/users-table";
import type { createClient } from "@/lib/supabase/server";

type Supabase = ReturnType<typeof createClient>;

export async function loadAdminUserRows(supabase: Supabase) {
  const [paymentsRes, profilesRes, userPkgsRes, walletsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("user_id, amount_usd, status")
      .eq("status", "confirmed"),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("user_packages")
      .select(
        "user_id, variant_snapshot, package_variants(risk_tier, packages(name))"
      )
      .eq("status", "active"),
    supabase.from("wallet_balances").select("*"),
  ]);

  const activePkgByUser = new Map(
    (userPkgsRes.data ?? []).map((up) => {
      const terms = resolveUserPackageTerms(
        up as unknown as Pick<UserPackage, "variant_snapshot" | "package_variants">
      );
      return [up.user_id, packageDisplayLabel(terms)] as const;
    })
  );
  const walletByUser = new Map(
    (walletsRes.data ?? []).map((w) => [w.user_id, w])
  );
  const depositedByUser = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    depositedByUser.set(
      p.user_id,
      (depositedByUser.get(p.user_id) ?? 0) + Number(p.amount_usd)
    );
  }

  const rows: AdminUserRow[] = (profilesRes.data ?? []).map((pr) => {
    const w = walletByUser.get(pr.id);
    return {
      id: pr.id,
      email: pr.email,
      full_name: pr.full_name,
      packageName: activePkgByUser.get(pr.id) ?? null,
      totalDeposited: depositedByUser.get(pr.id) ?? 0,
      available: Number(w?.available_usd ?? 0),
      pending: Number(w?.pending_usd ?? 0),
      created_at: pr.created_at,
    };
  });

  return rows;
}

export async function loadAdminPayments(supabase: Supabase) {
  const { data } = await supabase
    .from("payments")
    .select(
      "*, variant_snapshot, package_variants(*, packages(*)), profiles(email, full_name)"
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as Payment[];
}
