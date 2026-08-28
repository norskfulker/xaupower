"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatUsd } from "@/lib/format";
import type { UserPackage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BotAccountSelect({
  accounts,
  value,
  onChange,
  className,
}: {
  accounts: UserPackage[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-label">
        No active bot account. Buy a bot plan first.
      </p>
    );
  }

  const selected = accounts.find((a) => a.id === value) ?? accounts[0];

  return (
    <div className={cn("space-y-2", className)}>
      <Label>Bot account ID</Label>
      <Select
        value={value || selected?.id}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger
          className="h-11 w-full rounded-md border-border bg-canvas px-3.5 text-left"
        >
          <SelectValue placeholder="Select bot account">
            {selected?.account_code ?? "Select account"} ·{" "}
            {formatUsd(selected?.available_usd ?? 0)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="rounded-md p-1">
          {accounts.map((account) => (
            <SelectItem
              key={account.id}
              value={account.id}
              className="rounded-md py-2.5 pl-3 pr-9"
            >
              <span className="font-mono font-semibold text-ink">
                {account.account_code ?? account.id.slice(0, 8)}
              </span>
              <span className="text-muted-label">
                · {formatUsd(account.available_usd ?? 0)} available
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
