import { createClient } from "@/lib/supabase/server";
import { AnalyticsFilters } from "@/components/admin/analytics-filters";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { buildAnalytics, resolveAnalyticsRange } from "@/lib/analytics";
import { loadAdminPayments } from "@/lib/admin-loaders";
import { format } from "date-fns";
import type { Account, Payout, Signal } from "@/lib/types";

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    grain?: string;
  }>;
}) {
  const { range, grain, from, to } = resolveAnalyticsRange(await searchParams);
  const supabase = await createClient();

  const [payments, payoutsRes, signalsRes, profilesRes, accountsRes] =
    await Promise.all([
      loadAdminPayments(supabase),
      supabase.from("payouts").select("*"),
      supabase.from("signals").select("*"),
      supabase.from("profiles").select("id, created_at"),
      supabase
        .from("accounts")
        .select("user_id, status, purchased_at, expires_at"),
    ]);

  const data = buildAnalytics({
    payments,
    payouts: (payoutsRes.data ?? []) as Payout[],
    signals: (signalsRes.data ?? []) as Signal[],
    profiles: profilesRes.data ?? [],
    accounts: (accountsRes.data ?? []) as Pick<
      Account,
      "user_id" | "purchased_at" | "expires_at" | "status"
    >[],
    from,
    to,
    grain,
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display mt-1 text-3xl sm:text-4xl">Analytics</h1>
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
