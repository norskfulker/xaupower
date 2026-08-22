import { AppHeader } from "@/components/layout/app-header";
import { AccessToast } from "@/components/auth/access-toast";
import {
  getAuthUser,
  getOwnProfile,
  createClient,
  redirectIfMfaPending,
  getPriceQuotes,
} from "@/lib/supabase/server";
import { packageDisplayLabel, resolveUserPackageTerms } from "@/lib/package-terms";
import type { UserPackage } from "@/lib/types";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function DashboardFallback() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg bg-white shadow-sm"
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="h-64 animate-pulse rounded-lg bg-white shadow-sm lg:col-span-3" />
        <div className="h-64 animate-pulse rounded-lg bg-white shadow-sm lg:col-span-2" />
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

  const supabase = createClient();
  const [profile, pkgRes, quotes] = await Promise.all([
    getOwnProfile(user.id),
    supabase
      .from("user_packages")
      .select("variant_snapshot, package_variants(risk_tier, packages(name))")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    getPriceQuotes(),
  ]);

  const terms = resolveUserPackageTerms(
    (pkgRes.data ?? {}) as Pick<UserPackage, "variant_snapshot" | "package_variants">
  );
  const memberLabel = packageDisplayLabel(terms) ?? "Member";

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
