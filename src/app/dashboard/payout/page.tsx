import { redirect } from "next/navigation";

/** Payouts happen via the dashboard's accounts section. */
export default function PayoutPage() {
  redirect("/dashboard");
}