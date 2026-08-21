import { createClient, getAuthUser } from "@/lib/supabase/server";
import { PaymentFlow } from "@/components/payment/payment-flow";
import { TradingViewSetup } from "@/components/signals/tradingview-setup";
import { formatUsd } from "@/lib/format";
import {
  SIGNAL_PRICE_USD,
  type DepositAddress,
  type Payment,
  type UserSignalAccess,
} from "@/lib/types";

export default async function SignalsSetupPage() {
  const supabase = createClient();
  const user = await getAuthUser();

  const [addressesRes, paymentsRes, accessRes] = await Promise.all([
    supabase.from("deposit_addresses").select("*").eq("is_active", true),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", user!.id)
      .eq("kind", "signal")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_signal_access")
      .select("*")
      .eq("user_id", user!.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const access = accessRes.data as UserSignalAccess | null;
  const active =
    access &&
    (!access.expires_at || new Date(access.expires_at).getTime() > Date.now());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">TradingView pine script</h1>
        <p className="text-sm text-muted-label">
          Standalone path — no VPS bot. Pay {formatUsd(SIGNAL_PRICE_USD)} / 30
          days, wait for admin approval, then apply the XAUUSD pine script on
          TradingView yourself.
        </p>
      </div>

      {active ? (
        <div className="rounded-lg bg-white shadow-sm p-6">
          <TradingViewSetup expiresAt={access?.expires_at} />
        </div>
      ) : (
        <div className="rounded-lg bg-white shadow-sm p-6">
          <PaymentFlow
            kind="signal"
            depositAddresses={(addressesRes.data ?? []) as DepositAddress[]}
            initialPayments={(paymentsRes.data ?? []) as Payment[]}
          />
        </div>
      )}
    </div>
  );
}
