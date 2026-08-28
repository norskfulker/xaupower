import { redirect } from "next/navigation";

/** Deposits live in Cashier — keep this route for old links. */
export default function BalancePage() {
  redirect("/dashboard/cashier");
}
