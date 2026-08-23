import { redirect } from "next/navigation";

/** Payouts live in Cashier — keep this route for old links. */
export default function PayoutPage() {
  redirect("/dashboard");
}
