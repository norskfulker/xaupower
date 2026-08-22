import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PackagesCatalog } from "./packages-catalog";
import { AccessHistoryCards } from "@/components/dashboard/access-history-cards";
import type { Package, PackageVariant, UserPackage } from "@/lib/types";

export default async function PackagesPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [packagesRes, variantsRes, historyRes] = await Promise.all([
    supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
    supabase.from("package_variants").select("*"),
    supabase
      .from("user_packages")
      .select(
        "id, status, purchased_at, expires_at, variant_snapshot, package_variants(risk_tier, packages(name), max_lot_size, profit_target_pct, max_drawdown_pct)"
      )
      .eq("user_id", user!.id)
      .order("purchased_at", { ascending: false }),
  ]);

  const history = (historyRes.data ?? []) as unknown as UserPackage[];

  const variants = ((variantsRes.data ?? []) as PackageVariant[]).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  }));

  return (
    <div className="space-y-6">
      <PackagesCatalog
        packages={(packagesRes.data ?? []) as Package[]}
        variants={variants}
      />
      <AccessHistoryCards rows={history} />
    </div>
  );
}
