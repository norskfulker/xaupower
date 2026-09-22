import { getAuthUser } from "@/lib/supabase/server";
import {
  getAccountsForUser,
  getTransactionsForUser,
} from "@/lib/supabase/accounts";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export const metadata = {
  title: "Transactions — XAUPower",
};

export default async function TransactionsPage() {
  const user = await getAuthUser();
  if (!user) return null;

  const [accounts, txRes] = await Promise.all([
    getAccountsForUser(user.id),
    getTransactionsForUser(user.id, 200),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Transactions</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-label">
          Ledger entries across all your accounts. Pair rows indicate
          transfers.
        </p>
      </div>
      <TransactionsTable rows={txRes} accounts={accounts} />
    </div>
  );
}