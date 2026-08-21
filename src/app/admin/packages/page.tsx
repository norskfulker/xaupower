import { createClient } from "@/lib/supabase/server";
import { PackagesEditor } from "@/components/admin/packages-editor";
import type { Package, PackageVariant } from "@/lib/types";

export default async function AdminPackagesPage() {
  const supabase = createClient();
  const [{ data: variants }, { data: active }] = await Promise.all([
    supabase
      .from("package_variants")
      .select("*, packages(*)")
      .order("price_usd"),
    supabase
      .from("user_packages")
      .select("package_variant_id")
      .eq("status", "active"),
  ]);

  const counts = new Map<string, number>();
  for (const row of active ?? []) {
    counts.set(
      row.package_variant_id,
      (counts.get(row.package_variant_id) ?? 0) + 1
    );
  }

  const rows = ((variants ?? []) as (PackageVariant & { packages?: Package })[]).map(
    (v) => ({
      ...v,
      roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
      activeCount: counts.get(v.id) ?? 0,
    })
  );

  return <PackagesEditor initialRows={rows} />;
}
