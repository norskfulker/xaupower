import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PackagesWorkspace } from "./packages-workspace";
import type {
  DepositAddress,
  LedgerTransaction,
  Package,
  PackageVariant,
  Payment,
  UserPackage,
} from "@/lib/types";

export default async function PackagesPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [
    packagesRes,
    variantsRes,
    historyRes,
    pendingRes,
    addressesRes,
    profitsRes,
  ] = await Promise.all([
      supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
      supabase.from("package_variants").select("*"),
      supabase
        .from("user_packages")
        .select(
          "id, status, purchased_at, expires_at, account_code, available_usd, pending_usd, variant_snapshot, package_variants(risk_tier, price_usd, packages(name))"
        )
        .eq("user_id", user!.id)
        .order("purchased_at", { ascending: false }),
      supabase
        .from("payments")
        .select(
          "id, kind, status, amount_usd, created_at, user_package_id, package_variant_id, variant_snapshot, package_variants(id, risk_tier, price_usd, package_id, packages(name))"
        )
        .eq("user_id", user!.id)
        .eq("kind", "package")
        .in("status", ["pending_review", "waiting", "confirming"])
        .order("created_at", { ascending: false }),
      supabase.from("deposit_addresses").select("*").eq("is_active", true),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("type", "bot_return")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const variants = ((variantsRes.data ?? []) as PackageVariant[]).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  }));

  return (
    <PackagesWorkspace
      packages={(packagesRes.data ?? []) as Package[]}
      variants={variants}
      depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
      history={(historyRes.data ?? []) as unknown as UserPackage[]}
      pendingPayments={(pendingRes.data ?? []) as unknown as Payment[]}
      profitReturns={(profitsRes.data ?? []) as LedgerTransaction[]}
    />
  );
}
