import { createClient } from "@/lib/supabase/server";
import { AnalyticsFilters } from "@/components/admin/analytics-filters";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { buildAnalytics, resolveAnalyticsRange } from "@/lib/analytics";
import { loadAdminPayments } from "@/lib/admin-loaders";
import { format } from "date-fns";
import type { Payout, Signal, UserPackage } from "@/lib/types";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string; grain?: string };
}) {
  const { range, grain, from, to } = resolveAnalyticsRange(searchParams);
  const supabase = createClient();

  const [payments, payoutsRes, signalsRes, profilesRes, pkgsRes] =
    await Promise.all([
      loadAdminPayments(supabase),
      supabase.from("payouts").select("*"),
      supabase.from("signals").select("*"),
      supabase.from("profiles").select("id, created_at"),
      supabase
        .from("user_packages")
        .select("user_id, purchased_at, expires_at"),
    ]);

  const data = buildAnalytics({
    payments,
    payouts: (payoutsRes.data ?? []) as Payout[],
    signals: (signalsRes.data ?? []) as Signal[],
    profiles: profilesRes.data ?? [],
    packages: (pkgsRes.data ?? []) as Pick<
      UserPackage,
      "user_id" | "purchased_at" | "expires_at"
    >[],
    from,
    to,
    grain,
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-muted-label">
            Charts only — filter applies to every breakdown on this page.
          </p>
        </div>
        <AnalyticsFilters
          range={range}
          grain={grain}
          from={format(from, "yyyy-MM-dd")}
          to={format(to, "yyyy-MM-dd")}
        />
      </div>
      <AnalyticsCharts data={data} />
    </>
  );
}
