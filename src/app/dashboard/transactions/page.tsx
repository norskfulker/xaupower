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
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Ledger</p>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Transactions</h1>
      </div>
      {terms && (
        <div className="rounded-2xl bg-card p-6 shadow-card sm:p-7">
          <p className="text-kicker">Purchased package terms</p>
          <p className="mt-3 text-xl font-black tracking-tight text-ink">
            {label}
            {daysLeft != null ? ` · ${daysLeft} days left` : ""}
          </p>
          <div className="mt-5 grid items-stretch gap-4 sm:grid-cols-3 sm:gap-5">
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
    <div className="flex min-h-[6.5rem] flex-col rounded-2xl bg-canvas p-4 sm:p-5">
      <p className="text-kicker">{label}</p>
      <p className="mt-3 text-2xl font-black tabular text-orange sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
