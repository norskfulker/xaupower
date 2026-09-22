import { redirect } from "next/navigation";
import { getAuthUser, getOwnProfile } from "@/lib/supabase/server";
import { DailyReturnsButton } from "@/components/admin/daily-returns-button";

export const metadata = {
  title: "Daily returns — Admin",
};

export default async function AdminDailyReturnsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const profile = await getOwnProfile(user.id);
  if (profile?.role !== "admin") redirect("/dashboard?toast=no-access");

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Daily returns</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-label">
          Credits the daily bot return to every active account.
          Idempotent — safe to run multiple times per day.
        </p>
      </div>

      <DailyReturnsButton />

      <div className="rounded-2xl bg-card p-6 shadow-card sm:p-7">
        <p className="text-sm font-semibold text-ink">How it works</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-label">
          <li>For each active account, the cron reads available_usd.</li>
          <li>
            The tier rate is applied: 0.8% (conservative), 1.2% (standard),
            1.8% (aggressive).
          </li>
          <li>
            Returns are added to available_usd and recorded as a
            <code className="mx-1 rounded bg-canvas px-1 text-ink">daily_return</code>
            transaction.
          </li>
          <li>
            The UNIQUE (account_id, credit_date) constraint prevents double
            credits if the cron runs twice.
          </li>
        </ul>
      </div>
    </section>
  );
}
