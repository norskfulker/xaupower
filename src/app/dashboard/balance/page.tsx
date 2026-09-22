import { redirect } from "next/navigation";

/** Balance/deposit live in the dashboard's accounts section. */
export default function BalancePage() {
  redirect("/dashboard");
}