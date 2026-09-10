import { createClient, getAuthUser } from "@/lib/supabase/server";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import { daysRemaining } from "@/lib/format";
import type { LedgerTransaction, UserPackage } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();
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
        "id, account_code, expires_at, variant_snapshot, package_variants(risk_tier, strategy_label, packages(name), price_usd, max_lot_size, profit_target_pct, max_drawdown_pct, roadmap)"
      )
      .eq("user_id", user!.id)
      .eq("status", "active")
      .order("purchased_at", { ascending: false }),
  ]);

  const bots = (pkgRes.data ?? []) as unknown as UserPackage[];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-kicker">Ledger</p>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Transactions</h1>
        {bots.length > 1 && (
          <p className="mt-2 text-sm text-muted-label">
            You have {bots.length} active bots. Ledger rows can belong to
            different bot IDs.
          </p>
        )}
      </div>
      {bots.length > 0 && (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {bots.map((bot) => {
            const terms = resolveUserPackageTerms(bot);
            const label = packageDisplayLabel(terms);
            const daysLeft = daysRemaining(bot.expires_at);
            return (
              <div
                key={bot.id ?? bot.account_code}
                className="rounded-2xl bg-card p-6 shadow-card"
              >
                <p className="font-mono text-sm font-bold text-orange">
                  {bot.account_code ?? "Bot"}
                </p>
                <p className="mt-2 text-lg font-black tracking-tight text-ink">
                  {label}
                  {daysLeft != null ? ` · ${daysLeft}d left` : ""}
                </p>
                {terms && (
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Term
                      label="Target"
                      value={`${terms.profit_target_pct}%`}
                    />
                    <Term label="Lots" value={String(terms.max_lot_size)} />
                    <Term
                      label="DD"
                      value={`${terms.max_drawdown_pct}%`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <TransactionsTable rows={(data ?? []) as LedgerTransaction[]} />
    </div>
  );
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-canvas px-2 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-label">
        {label}
      </p>
      <p className="mt-1 text-sm font-black tabular text-orange">{value}</p>
    </div>
  );
}
