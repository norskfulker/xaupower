import { AppHeader } from "@/components/layout/app-header";
import { AccessToast } from "@/components/auth/access-toast";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader variant="user" email={profile?.email ?? user.email} />
      <nav className="border-b border-border bg-white/60">
        <div className="mx-auto flex max-w-7xl gap-4 px-4 py-2 text-sm sm:px-6">
          <Link href="/dashboard" className="text-ink/70 hover:text-orange">
            Overview
          </Link>
          <Link
            href="/dashboard/payment"
            className="text-ink/70 hover:text-orange"
          >
            Payment
          </Link>
          <Link
            href="/dashboard/payout"
            className="text-ink/70 hover:text-orange"
          >
            Payout
          </Link>
          <Link
            href="/dashboard/transactions"
            className="text-ink/70 hover:text-orange"
          >
            Transactions
          </Link>
        </div>
      </nav>
      <Suspense fallback={null}>
        <AccessToast />
      </Suspense>
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
