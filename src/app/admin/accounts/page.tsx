import { createClient } from "@/lib/supabase/server";
import { AccountsTable } from "@/components/admin/accounts-table";
import { redirect } from "next/navigation";
import { getAuthUser, getOwnProfile } from "@/lib/supabase/server";

export const metadata = {
  title: "Accounts — Admin",
};

export default async function AdminAccountsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  const profile = await getOwnProfile(user.id);
  if (profile?.role !== "admin") redirect("/dashboard?toast=no-access");

  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("purchased_at", { ascending: false })
    .limit(500);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name");
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p])
  );

  const enriched = (accounts ?? []).map((a) => ({
    ...a,
    email: (profileMap.get(a.user_id as string) as { email?: string } | undefined)?.email ?? "—",
    full_name: (profileMap.get(a.user_id as string) as { full_name?: string } | undefined)?.full_name ?? null,
  }));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Accounts</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-label">
          All user accounts across the platform.
        </p>
      </div>
      <AccountsTable rows={enriched} />
    </section>
  );
}