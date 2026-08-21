import { createClient } from "@/lib/supabase/server";
import { SignalManager } from "@/components/admin/signal-manager";
import type { Signal } from "@/lib/types";

export default async function AdminSignalsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("signals")
    .select("*")
    .order("opened_at", { ascending: false })
    .limit(100);

  return <SignalManager initialSignals={(data ?? []) as Signal[]} />;
}
