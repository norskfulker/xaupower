import { CashierWorkspace } from "@/components/dashboard/cashier-workspace";

export const metadata = {
  title: "Cashier — XAUPower",
};

export default function CashierPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const tab =
    searchParams.tab === "withdraw" || searchParams.tab === "buybot"
      ? searchParams.tab
      : "balance";

  return (
    <CashierWorkspace
      initialTab={tab as "balance" | "buybot" | "withdraw"}
    />
  );
}
