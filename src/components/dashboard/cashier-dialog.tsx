"use client";

import { useState } from "react";
import { CashierWorkspace, type CashierTab } from "@/components/dashboard/cashier-workspace";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function CashierDialog({
  className,
  variant = "outline",
  size = "default",
  fullWidth = true,
  initialTab = "balance",
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
  initialTab?: CashierTab;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          "h-11 justify-start gap-2",
          className
        )}
      >
        <Wallet className="size-4 shrink-0" />
        Cashier
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cashier</DialogTitle>
          <DialogDescription>
            Deposit or withdraw from a bot account.
          </DialogDescription>
        </DialogHeader>
        <CashierWorkspace initialTab={initialTab} compact />
      </DialogContent>
    </Dialog>
  );
}

export function CashierNavItem({
  active,
  pill,
}: {
  active?: boolean;
  pill?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          pill
            ? "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition"
            : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
          active || open
            ? "bg-orange text-white"
            : "text-ink/70 hover:bg-orange/10 hover:text-ink"
        )}
      >
        <Wallet className="size-4 shrink-0" />
        Cashier
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cashier</DialogTitle>
          <DialogDescription>
            Deposit or withdraw from a bot account.
          </DialogDescription>
        </DialogHeader>
        <CashierWorkspace compact />
      </DialogContent>
    </Dialog>
  );
}

export function CashierBottomNavItem({ active }: { active?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pageActive =
    active ||
    pathname.startsWith("/dashboard/cashier") ||
    pathname.startsWith("/dashboard/balance") ||
    pathname.startsWith("/dashboard/payout") ||
    pathname.startsWith("/dashboard/payment");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
          pageActive || open ? "text-orange" : "text-ink/60"
        )}
      >
        <Wallet className="size-5 shrink-0" />
        <span className="truncate">Cashier</span>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cashier</DialogTitle>
          <DialogDescription>
            Deposit or withdraw from a bot account.
          </DialogDescription>
        </DialogHeader>
        <CashierWorkspace compact />
      </DialogContent>
    </Dialog>
  );
}

/** Deep-link fallback still available for shared URLs. */
export function CashierPageLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/cashier"
      prefetch={false}
      className={cn("text-sm font-semibold text-orange hover:underline", className)}
    >
      Open full cashier
    </Link>
  );
}
