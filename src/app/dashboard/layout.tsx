import { AppHeader } from "@/components/layout/app-header";
import { AccessToast } from "@/components/auth/access-toast";
import {
  getAuthUser,
  getOwnProfile,
  redirectIfMfaPending,
  getPriceQuotes,
} from "@/lib/supabase/server";
import { getAccountsForUser } from "@/lib/supabase/accounts";
import type { Account } from "@/lib/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-4 sm:grid-cols-3 sm:gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[11rem] animate-pulse rounded-2xl bg-card shadow-card sm:min-h-[12.5rem]"
          />
        ))}
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-2 sm:gap-6">
        <div className="min-h-72 animate-pulse rounded-2xl bg-card shadow-card" />
        <div className="min-h-72 animate-pulse rounded-2xl bg-card shadow-card" />
      </div>
    </div>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  await redirectIfMfaPending("/dashboard");

  const [profile, accounts, quotes] = await Promise.all([
    getOwnProfile(user.id),
    getAccountsForUser(user.id),
    getPriceQuotes(),
  ]);

  const activeAccounts = accounts.filter((a: Account) => a.status === "active");
  const memberLabel =
    activeAccounts.length > 1
      ? `${activeAccounts.length} accounts`
      : activeAccounts[0]?.name ?? "Member";

  return (
    <AppHeader
      variant="user"
      email={profile?.email ?? user.email}
      fullName={profile?.full_name}
      userId={user.id}
      isAdmin={profile?.role === "admin"}
      memberLabel={memberLabel}
      initialQuotes={quotes}
    >
      <Suspense fallback={null}>
        <AccessToast />
      </Suspense>
      <Suspense fallback={<DashboardFallback />}>{children}</Suspense>
    </AppHeader>
  );
}
