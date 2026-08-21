import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import { daysRemaining } from "@/lib/format";
import type { LedgerTransaction, UserPackage } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [{ data }, pkgRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("user_packages")
      .select(
        "expires_at, variant_snapshot, package_variants(risk_tier, packages(name), price_usd, max_lot_size, profit_target_pct, max_drawdown_pct, roadmap)"
      )
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const terms = resolveUserPackageTerms(
    (pkgRes.data ?? {}) as Pick<
      UserPackage,
      "variant_snapshot" | "package_variants"
    >
  );
  const label = packageDisplayLabel(terms);
  const daysLeft = daysRemaining(pkgRes.data?.expires_at);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-ink">Transactions</h1>
        <p className="text-sm text-muted-label">
          Read-only ledger of deposits, payouts, and package purchases.
        </p>
      </div>
      {terms && (
        <div className="rounded-lg bg-white shadow-sm p-5">
          <p className="text-xs uppercase tracking-wide text-muted-label">
            Purchased package terms
          </p>
          <p className="mt-1 text-lg font-bold text-ink">
            {label}
            {daysLeft != null ? ` · ${daysLeft} days left` : ""}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Term
              label="Bot profit target"
              value={`${terms.profit_target_pct}%`}
            />
            <Term label="Max lots" value={String(terms.max_lot_size)} />
            <Term
              label="Max drawdown band"
              value={`${terms.max_drawdown_pct}%`}
            />
          </div>
        </div>
      )}
      <TransactionsTable rows={(data ?? []) as LedgerTransaction[]} />
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-label">{label}</p>
      <p className="mt-1 text-lg font-extrabold tabular text-orange">{value}</p>
    </div>
  );
}
