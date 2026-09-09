import { CashierWorkspace } from "@/components/dashboard/cashier-workspace";

export const metadata = {
  title: "Cashier — XAUPower",
};

export default function CashierPage({
  searchParams,
}: {
  searchParams: { tab?: string; bot?: string };
}) {
  const tab = searchParams.tab === "withdraw" ? "withdraw" : "balance";

  return (
    <CashierWorkspace
      initialTab={tab}
      initialBotId={searchParams.bot}
    />
  );
}
