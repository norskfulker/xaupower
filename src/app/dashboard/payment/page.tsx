import { createClient } from "@/lib/supabase/server";
import { RouteFinanceDialog } from "@/components/finance/route-finance-dialog";
import type {
  DepositAddress,
  Package,
  PackageVariant,
  Payment,
  Payout,
  WalletBalance,
} from "@/lib/types";

export default async function PaymentPage({
  searchParams,
}: {
  searchParams: { package?: string; variant?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [packagesRes, variantsRes, addressesRes, walletRes, payoutsRes, paymentsRes] =
    await Promise.all([
      supabase.from("packages").select("*").eq("is_active", true).order("price_usd"),
      supabase.from("package_variants").select("*"),
      supabase.from("deposit_addresses").select("*").eq("is_active", true),
      supabase
        .from("wallet_balances")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle(),
      supabase
        .from("payouts")
        .select("*")
        .eq("user_id", user!.id)
        .order("requested_at", { ascending: false })
        .limit(20),
      supabase
        .from("payments")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Payment</h1>
      <p className="text-sm text-muted-label">
        Deposit crypto to activate a plan. Withdrawals use the same wallet dialog.
      </p>
      <RouteFinanceDialog
        packages={(packagesRes.data ?? []) as Package[]}
        variants={variants}
        depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
        wallet={walletRes.data as WalletBalance | null}
        payouts={(payoutsRes.data ?? []) as Payout[]}
        payments={(paymentsRes.data ?? []) as Payment[]}
        initialTab="deposit"
        initialVariantId={variantId}
      />
    </div>
  );
}
