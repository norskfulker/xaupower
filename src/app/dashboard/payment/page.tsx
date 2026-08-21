import { createClient, getAuthUser } from "@/lib/supabase/server";
import { DepositsWorkspace } from "@/components/finance/deposits-workspace";
import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/format";
import { formatRail } from "@/lib/wallets";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
} from "@/lib/types";
import { format } from "date-fns";
import { Clock, CreditCard, Landmark } from "lucide-react";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: { package?: string; variant?: string };
}) {
  const supabase = createClient();
  const user = await getAuthUser();

  const [packagesRes, variantsRes, addressesRes, paymentsRes, pkgRes] =
    await Promise.all([
      supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
      supabase.from("package_variants").select("*"),
      supabase.from("deposit_addresses").select("*").eq("is_active", true),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_packages")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const payments = (paymentsRes.data ?? []) as Payment[];
  const confirmed = payments.filter((p) => p.status === "confirmed");
  const pending = payments.filter((p) => p.status === "pending_review");
  const last = payments[0];

  let variantId = searchParams.variant ?? null;
  if (!variantId && searchParams.package) {
    const match = (variantsRes.data ?? []).find(
      (v) =>
        v.package_id === searchParams.package && v.risk_tier === "standard"
    );
    variantId = match?.id ?? null;
  }

  const variants = ((variantsRes.data ?? []) as PackageVariant[]).map((v) => ({
    ...v,
    roadmap: Array.isArray(v.roadmap) ? v.roadmap : [],
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total deposited"
          value={formatUsd(
            confirmed.reduce((sum, p) => sum + Number(p.amount_usd), 0)
          )}
          hint="Confirmed deposits"
          icon={Landmark}
        />
        <StatCard
          label="Pending deposits"
          value={formatUsd(
            pending.reduce((sum, p) => sum + Number(p.amount_usd), 0)
          )}
          hint="Awaiting admin review"
          icon={Clock}
        />
        <StatCard
          label="Last deposit"
          value={
            last
              ? format(new Date(last.created_at), "d MMM yyyy")
              : "—"
          }
          hint={
            last
              ? `${formatRail(last.currency)} · ${last.status.replace(/_/g, " ")}`
              : "No deposits yet"
          }
          icon={CreditCard}
        />
      </div>

      <div className="rounded-2xl border border-orange/30 bg-orange/10 px-5 py-4 text-sm text-orange">
        All deposits require manual review. Submit your transaction hash after
        sending payment.
      </div>

      <DepositsWorkspace
        packages={(packagesRes.data ?? []) as Package[]}
        variants={variants}
        depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
        initialVariantId={variantId}
        hasActivePackage={Boolean(pkgRes.data)}
      />

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Deposit history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted-label">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-label">
                    No deposits yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-4 py-3 tabular text-ink/70">
                      {format(new Date(p.created_at), "d MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 tabular font-semibold text-orange">
                      {formatUsd(p.amount_usd)}
                    </td>
                    <td className="px-4 py-3 text-ink/80">
                      {formatRail(p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-label">
                      {p.id.slice(0, 8)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
