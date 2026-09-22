import { redirect } from "next/navigation";

/** Cashier actions are now on the dashboard directly. */
export default function CashierPage() {
  redirect("/dashboard");
}