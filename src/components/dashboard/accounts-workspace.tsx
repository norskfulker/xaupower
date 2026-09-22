"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/surface-card";
import { AccountSettingsInline } from "@/components/dashboard/account-settings-inline";
import { CopyButton } from "@/components/ui/copy-button";
import { CreateAccountDialog } from "@/components/dashboard/create-account-dialog";
import { DepositDialog } from "@/components/dashboard/deposit-dialog";
import { WithdrawDialog } from "@/components/dashboard/withdraw-dialog";
import { TransferDialog } from "@/components/dashboard/transfer-dialog";
import { formatUsd } from "@/lib/format";
import {
  ACCOUNT_STATUS_LABEL,
} from "@/lib/format";
import type { Account } from "@/lib/types";
import { cn } from "@/lib/utils";

type DialogKind =
  | { kind: "create" }
  | { kind: "deposit"; accountId: string }
  | { kind: "withdraw"; accountId: string }
  | { kind: "transfer"; accountId: string }
  | null;

export function AccountsWorkspace({
  accounts,
}: {
  accounts: Account[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);

  const active = useMemo(
    () => accounts.filter((a) => a.status === "active"),
    [accounts]
  );

  async function onAccountCreated(account: Account) {
    setDialog(null);
    toast.success(`${account.name} ready`);
    router.refresh();
  }

  return (
    <section className="space-y-4">
      {accounts.length === 0 ? (
        <SurfaceCard className="flex flex-col items-center gap-3 py-10 text-center">
          <WalletIcon className="size-8 text-orange" />
          <h3 className="font-display text-lg text-ink">No accounts yet</h3>
          <p className="max-w-md text-sm text-muted-label">
            Create your first account.
          </p>
          <Button
            onClick={() => setDialog({ kind: "create" })}
            className="gap-2 bg-orange text-white hover:bg-orange/90"
          >
            <Plus className="size-4" /> Create account
          </Button>
        </SurfaceCard>
      ) : (
        <div
          className={cn(
            "grid items-stretch gap-4 sm:gap-6",
            accounts.length > 1 ? "lg:grid-cols-2" : "lg:grid-cols-1"
          )}
        >
          {accounts.map((account) => {
            const status = ACCOUNT_STATUS_LABEL[account.status];
            return (
              <SurfaceCard
                key={account.id}
                className="flex h-full flex-col"
                padding="lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-black tracking-tight text-orange">
                      {account.name}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-mono text-sm text-muted-label">
                        {account.account_code}
                      </p>
                      <CopyButton
                        value={account.account_code}
                        label={`Copy account code ${account.account_code}`}
                      />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
                      account.status === "active"
                        ? "bg-teal/20 text-teal"
                        : account.status === "expired"
                          ? "bg-hotpink/20 text-hotpink"
                          : "bg-orange/15 text-orange"
                    )}
                  >
                    {status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="text-sm font-semibold text-ink">Available</p>
                    <p
                      className={cn(
                        "mt-2 text-xl font-black tabular",
                        Number(account.available_usd) > 0
                          ? "text-teal"
                          : "text-ink"
                      )}
                    >
                      {formatUsd(account.available_usd)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="text-sm font-semibold text-ink">Capital</p>
                    <p className="mt-2 text-xl font-black tabular text-ink">
                      {formatUsd(account.capital_usd)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={() => setDialog({ kind: "deposit", accountId: account.id })}
                    disabled={account.status !== "active"}
                  >
                    <ArrowDownLeft className="size-4" />
                    Deposit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={() => setDialog({ kind: "withdraw", accountId: account.id })}
                    disabled={
                      account.status !== "active" ||
                      Number(account.available_usd) <= 0
                    }
                  >
                    <ArrowUpRight className="size-4" />
                    Withdraw
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={() => setDialog({ kind: "transfer", accountId: account.id })}
                    disabled={
                      account.status !== "active" ||
                      accounts.filter((a) => a.status === "active").length < 2
                    }
                  >
                    <ArrowLeftRight className="size-4" />
                    Transfer
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-label">
                  <span className="inline-flex size-2 rounded-full bg-orange" />
                  <span className="font-semibold text-ink">{ACCOUNT_STATUS_LABEL[account.status]}</span>
                  <span>· 1:{account.leverage} · {account.execution_type}</span>
                </div>

                <AccountSettingsInline account={account} />
              </SurfaceCard>
            );
          })}
        </div>
      )}

      {dialog?.kind === "create" && (
        <CreateAccountDialog
          open
          onClose={() => setDialog(null)}
          onCreated={onAccountCreated}
        />
      )}
      {dialog?.kind === "deposit" && (
        <DepositDialog
          open
          accountId={dialog.accountId}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "withdraw" && (
        <WithdrawDialog
          open
          accountId={dialog.accountId}
          accounts={accounts}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "transfer" && (
        <TransferDialog
          open
          sourceAccountId={dialog.accountId}
          accounts={active}
          onClose={() => setDialog(null)}
        />
      )}
    </section>
  );
}