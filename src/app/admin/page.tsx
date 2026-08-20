import { createClient } from "@/lib/supabase/server";
import { formatUsd } from "@/lib/format";
import { RevenueChart } from "@/components/charts/dashboard-charts";
import { PayoutReviewQueue } from "@/components/admin/payout-review-queue";
import { PaymentReviewQueue } from "@/components/admin/payment-review-queue";
import { SignalManager } from "@/components/admin/signal-manager";
import { UsersTable, type AdminUserRow } from "@/components/admin/users-table";
import { PaymentsTable } from "@/components/admin/payments-table";
import type { Package, PackageVariant, Payment, Payout, Signal } from "@/lib/types";
import { format, startOfMonth, subWeeks } from "date-fns";

export default async function AdminPage() {
  const supabase = createClient();

  const [
    paymentsRes,
    profilesRes,
    userPkgsRes,
    walletsRes,
    payoutsRes,
    signalsRes,
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("*, package_variants(*, packages(*)), profiles(email, full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("user_packages")
      .select("*, package_variants(*, packages(*))")
      .eq("status", "active"),
    supabase.from("wallet_balances").select("*"),
    supabase
      .from("payouts")
      .select("*, profiles(email, full_name)")
      .order("requested_at", { ascending: false }),
    supabase
      .from("signals")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(100),
  ]);

  const payments = (paymentsRes.data ?? []) as Payment[];
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const pendingDeposits = payments.filter((p) => p.status === "pending_review");
  const totalRevenue = confirmed.reduce(
    (sum, p) => sum + Number(p.amount_usd),
    0
  );

  const monthStart = startOfMonth(new Date()).toISOString();
  const packagesSoldMonth = confirmed.filter(
    (p) => p.confirmed_at && p.confirmed_at >= monthStart
  ).length;

  const payouts = (payoutsRes.data ?? []) as Payout[];
  const pendingPayouts = payouts.filter((p) =>
    ["requested", "pending_review"].includes(p.status)
  );
  const reviewedPayouts = payouts.filter(
    (p) => !["requested", "pending_review"].includes(p.status)
  );

  const activePkgByUser = new Map(
    (userPkgsRes.data ?? []).map((up) => {
      const variant = up.package_variants as
        | (PackageVariant & { packages?: Package })
        | null;
      const label = variant
        ? `${variant.packages?.name ?? "Package"} ${variant.risk_tier}`
        : null;
      return [up.user_id, label] as const;
    })
  );
  const walletByUser = new Map(
    (walletsRes.data ?? []).map((w) => [w.user_id, w])
  );
  const depositedByUser = new Map<string, number>();
  for (const p of confirmed) {
    depositedByUser.set(
      p.user_id,
      (depositedByUser.get(p.user_id) ?? 0) + Number(p.amount_usd)
    );
  }

  const userRows: AdminUserRow[] = (profilesRes.data ?? []).map((pr) => {
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
      <section id="stats" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatUsd(totalRevenue)} />
        <StatCard
          label="Active users"
          value={String(userRows.filter((u) => u.packageName).length)}
        />
        <StatCard
          label="Packages sold this month"
          value={String(packagesSoldMonth)}
        />
        <StatCard
          label="Pending payouts"
          value={String(pendingPayouts.length)}
          highlight
        />
      </section>

      <RevenueChart data={revenueByWeek} />

      <UsersTable rows={userRows} />

      <PaymentReviewQueue initialQueue={pendingDeposits} />

      <PaymentsTable payments={payments} />

      <PayoutReviewQueue
        initialQueue={pendingPayouts}
        initialReviewed={reviewedPayouts}
      />

      <SignalManager initialSignals={(signalsRes.data ?? []) as Signal[]} />
    </>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border-2 border-orange bg-orange/10 p-5"
          : "rounded-2xl border border-white/10 bg-white/5 p-5"
      }
    >
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular text-white">{value}</p>
    </div>
  );
}
