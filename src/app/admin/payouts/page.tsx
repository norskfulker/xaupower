import { createClient } from "@/lib/supabase/server";
import { PayoutReviewQueue } from "@/components/admin/payout-review-queue";
import type { Payout } from "@/lib/types";

export default async function AdminPayoutsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("payouts")
    .select("*, profiles(email, full_name)")
    .order("requested_at", { ascending: false });

  const payouts = (data ?? []) as Payout[];
  const pending = payouts.filter((p) =>
    ["requested", "pending_review"].includes(p.status)
  );
  const reviewed = payouts.filter(
    (p) => !["requested", "pending_review"].includes(p.status)
  );

  return (
    <PayoutReviewQueue initialQueue={pending} initialReviewed={reviewed} />
  );
}
