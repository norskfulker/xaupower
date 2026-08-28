import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PackagesCatalog } from "./packages-catalog";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import type { DepositAddress, Package, PackageVariant, UserPackage } from "@/lib/types";

export default async function PackagesPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [packagesRes, variantsRes, historyRes, addressesRes] = await Promise.all([
    supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
    supabase.from("package_variants").select("*"),
    supabase
      .from("user_packages")
      .select(
        "id, status, purchased_at, expires_at, account_code, available_usd, pending_usd, variant_snapshot, package_variants(risk_tier, packages(name), max_lot_size, profit_target_pct, max_drawdown_pct)"
      )
      .eq("user_id", user!.id)
      .order("purchased_at", { ascending: false }),
    supabase.from("deposit_addresses").select("*").eq("is_active", true),
  ]);

  const history = (historyRes.data ?? []) as unknown as UserPackage[];

  const variants = ((variantsRes.data ?? []) as PackageVariant[]).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  }));

  return (
    <div className="space-y-8">
      <PackagesCatalog
        packages={(packagesRes.data ?? []) as Package[]}
        variants={variants}
        depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
      />
      <AccessHistoryCards rows={history} />
    </div>
  );
}
