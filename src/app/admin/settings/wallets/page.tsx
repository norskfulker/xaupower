import { createClient } from "@/lib/supabase/server";
import { WalletSettingsForm } from "@/components/admin/wallet-settings-form";
import type { DepositAddress } from "@/lib/types";

export default async function AdminWalletSettingsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("deposit_addresses")
    .select("*")
    .order("currency");

  return (
    <WalletSettingsForm
      initialAddresses={(data ?? []) as DepositAddress[]}
    />
  );
}
