import { createClient } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import type { LedgerTransaction } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Transactions</h1>
        <p className="text-sm text-muted-label">
          Read-only ledger of deposits, payouts, and package purchases.
        </p>
      </div>
      <TransactionsTable rows={(data ?? []) as LedgerTransaction[]} />
    </div>
  );
}
