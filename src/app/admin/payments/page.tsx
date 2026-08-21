import { createClient } from "@/lib/supabase/server";
import { PaymentReviewQueue } from "@/components/admin/payment-review-queue";
import { PaymentsTable } from "@/components/admin/payments-table";
import { loadAdminPayments } from "@/lib/admin-loaders";

export default async function AdminPaymentsPage() {
  const supabase = createClient();
  const payments = await loadAdminPayments(supabase);
  const pending = payments.filter((p) => p.status === "pending_review");

  return (
    <>
      <PaymentReviewQueue initialQueue={pending} />
      <PaymentsTable payments={payments} />
    </>
  );
}
