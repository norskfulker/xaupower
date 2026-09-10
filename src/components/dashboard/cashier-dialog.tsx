"use client";

import { useState } from "react";
import {
  CashierWorkspace,
  type CashierTab,
} from "@/components/dashboard/cashier-workspace";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const cashierSheetClassName = cn(
  "gap-0 border-border bg-card p-0 text-ink shadow-float",
  "inset-y-0 right-0 h-full w-full max-w-none border-l",
  "sm:max-w-xl md:max-w-2xl",
  "scrollbar-none"
);

function CashierSheetBody({
  initialTab = "balance",
}: {
  initialTab?: CashierTab;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border bg-canvas px-5 py-4 sm:px-6">
        <SheetHeader className="space-y-1 p-0 pr-8 text-left">
          <SheetTitle className="font-display text-xl text-ink">
            Cashier
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-label">
            Deposit or withdraw from a bot account.
          </SheetDescription>
        </SheetHeader>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-card px-4 py-4 sm:px-5 sm:py-5",
          "scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden"
        )}
      >
        <CashierWorkspace initialTab={initialTab} compact />
      </div>
    </div>
  );
}

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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          buttonVariants({ variant, size }),
          fullWidth && "w-full",
          "h-11 justify-start gap-2",
          className
        )}
      >
        <Wallet className="size-4 shrink-0" />
        Cashier
      </SheetTrigger>
      <SheetContent side="right" className={cashierSheetClassName}>
        <CashierSheetBody initialTab={initialTab} />
      </SheetContent>
    </Sheet>
  );
}

export function CashierNavItem({
  active,
  pill,
  side,
}: {
  active?: boolean;
  pill?: boolean;
  side?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = Boolean(active || open);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          side
            ? "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition"
            : pill
              ? "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition"
              : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
          selected
            ? side
              ? "text-orange"
              : "bg-orange text-white"
            : side
              ? "text-ink/70"
              : "text-ink/70 hover:bg-orange/10 hover:text-ink"
        )}
      >
        <Wallet className="size-4 shrink-0" />
        <span className="truncate">Cashier</span>
        {side && selected ? (
          <span
            aria-hidden
            className="absolute top-1/2 right-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gold"
          />
        ) : null}
      </SheetTrigger>
      <SheetContent side="right" className={cashierSheetClassName}>
        <CashierSheetBody />
      </SheetContent>
    </Sheet>
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold",
          pageActive || open ? "text-orange" : "text-ink/60"
        )}
      >
        <Wallet className="size-5 shrink-0" />
        <span className="truncate">Cashier</span>
      </SheetTrigger>
      <SheetContent side="right" className={cashierSheetClassName}>
        <CashierSheetBody />
      </SheetContent>
    </Sheet>
  );
}

/** Deep-link fallback still available for shared URLs. */
export function CashierPageLink({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard/cashier"
      prefetch={false}
      className={cn(
        "text-sm font-semibold text-orange hover:underline",
        className
      )}
    >
      Open full cashier
    </Link>
  );
}
