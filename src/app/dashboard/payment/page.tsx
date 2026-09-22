import { redirect } from "next/navigation";

/** Deposits happen via the dashboard's accounts section. */
export default function PaymentPage() {
  redirect("/dashboard");
}