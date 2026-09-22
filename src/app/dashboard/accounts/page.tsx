import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";
import { getAccountsForUser } from "@/lib/supabase/accounts";
import { AccountsWorkspace } from "@/components/dashboard/accounts-workspace";
import { CreateAccountButton } from "@/components/dashboard/create-account-button";

export const metadata = {
  title: "Accounts — XAUPower",
};

export default async function AccountsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const accounts = await getAccountsForUser(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-label">Manage</p>
          <h1 className="mt-1 font-display text-2xl tracking-tight text-ink sm:text-3xl">
            Accounts
          </h1>
        </div>
        <CreateAccountButton />
      </div>

      <AccountsWorkspace accounts={accounts} />
    </div>
  );
}
