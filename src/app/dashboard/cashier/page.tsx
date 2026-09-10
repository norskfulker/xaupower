import { CashierWorkspace } from "@/components/dashboard/cashier-workspace";

export const metadata = {
  title: "Cashier — XAUPower",
};

export default async function CashierPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; bot?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "withdraw" ? "withdraw" : "balance";

  return (
    <CashierWorkspace initialTab={tab} initialBotId={params.bot} />
  );
}
