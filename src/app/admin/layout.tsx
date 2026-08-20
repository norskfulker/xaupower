import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
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
    .select("email, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard?toast=no-access");
  }

  return (
    <div className="min-h-screen bg-ink text-white">
      <AppHeader variant="admin" email={profile.email} />
      <nav className="border-b border-white/10 bg-ink">
        <div className="mx-auto flex max-w-7xl gap-4 px-4 py-2 text-sm sm:px-6">
          <a href="#stats" className="text-white/70 hover:text-orange">
            Overview
          </a>
          <a href="#payments" className="text-white/70 hover:text-orange">
            Deposits
          </a>
          <a href="#payouts" className="text-white/70 hover:text-orange">
            Payout queue
          </a>
          <a href="#signals" className="text-white/70 hover:text-orange">
            Signals
          </a>
          <a href="#users" className="text-white/70 hover:text-orange">
            Users
          </a>
          <a
            href="/admin/settings/wallets"
            className="text-white/70 hover:text-orange"
          >
            Wallets
          </a>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
