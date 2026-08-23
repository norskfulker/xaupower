import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { RevenueChart } from "@/components/charts/dashboard-charts";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { loadAdminPayments, loadAdminUserRows } from "@/lib/admin-loaders";
import { format, subWeeks } from "date-fns";

export default async function AdminPage() {
  const supabase = createClient();
  const [payments, userRows, payoutsRes] = await Promise.all([
    loadAdminPayments(supabase),
    loadAdminUserRows(supabase),
    supabase
      .from("payouts")
      .select("id, status")
      .in("status", ["requested", "pending_review"]),
  ]);

  const confirmed = payments.filter((p) => p.status === "confirmed");
  const pendingDeposits = payments.filter((p) => p.status === "pending_review")
    .length;
  const totalRevenue = confirmed.reduce(
    (sum, p) => sum + Number(p.amount_usd),
    0
  );
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const packagesSoldMonth = confirmed.filter(
    (p) => p.confirmed_at && new Date(p.confirmed_at) >= monthStart
  ).length;

  const revenueByWeek = Array.from({ length: 8 }).map((_, i) => {
    const start = subWeeks(new Date(), 7 - i);
    const end = subWeeks(new Date(), 6 - i);
    const revenue = confirmed
      .filter((p) => {
        if (!p.confirmed_at) return false;
        const t = new Date(p.confirmed_at).getTime();
        return t >= start.getTime() && t < end.getTime();
      })
      .reduce((sum, p) => sum + Number(p.amount_usd), 0);
    return { week: format(start, "MMM d"), revenue };
  });

  return (
    <>
      <div>
        <p className="text-kicker">Admin</p>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Overview</h1>
      </div>

      <section id="stats" className="grid items-stretch gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
        <AdminStatCard label="Total revenue" value={formatUsd(totalRevenue)} />
        <AdminStatCard
          label="Active users"
          value={String(userRows.filter((u) => u.packageName).length)}
        />
        <AdminStatCard
          label="Packages sold this month"
          value={String(packagesSoldMonth)}
        />
        <AdminStatCard
          label="Pending deposits"
          value={String(pendingDeposits)}
          highlight
        />
        <AdminStatCard
          label="Pending payouts"
          value={String(payoutsRes.data?.length ?? 0)}
          highlight
        />
      </section>

      <RevenueChart data={revenueByWeek} />
    </>
  );
}
