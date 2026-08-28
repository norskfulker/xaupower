import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet } from "lucide-react";

export function CashierDialog({
  className,
  variant = "outline",
  size = "default",
  fullWidth = true,
}: {
  className?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
}) {
  return (
    <Link
      href="/dashboard/cashier"
      prefetch={false}
      className={cn(
        buttonVariants({ variant, size }),
        fullWidth && "w-full",
        "h-11 justify-start gap-2",
        className
      )}
    >
      <Wallet className="size-4 shrink-0" />
      Cashier
    </Link>
  );
}

export function CashierNavItem({
  active,
  pill,
}: {
  active?: boolean;
  pill?: boolean;
}) {
  return (
    <Link
      href="/dashboard/cashier"
      prefetch={false}
      className={cn(
        pill
          ? "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition"
          : "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
        active
          ? "bg-orange text-white"
          : "text-ink/70 hover:bg-orange/10 hover:text-ink"
      )}
    >
      <Wallet className="size-4 shrink-0" />
      Cashier
    </Link>
  );
}

export function CashierBottomNavItem({ active }: { active?: boolean }) {
  return (
    <Link
      href="/dashboard/cashier"
      prefetch={false}
      className={cn(
        "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
        active ? "text-orange" : "text-ink/60"
      )}
    >
      <Wallet className="size-5 shrink-0" />
      <span className="truncate">Cashier</span>
    </Link>
  );
}
