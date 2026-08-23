"use client";

import { CashierDialog } from "@/components/dashboard/cashier-dialog";
import { SurfaceCard } from "@/components/ui/surface-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cpu, MessageCircle } from "lucide-react";
import Link from "next/link";

const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/xaupower";

export function DashboardQuickActions() {
  return (
    <SurfaceCard>
      <p className="text-kicker">Quick actions</p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/packages"
          prefetch={false}
          className={cn(
            buttonVariants({}),
            "h-11 w-full justify-start gap-2 bg-orange text-white hover:bg-orange/90"
          )}
        >
          <Cpu className="size-4" />
          Buy Bot
        </Link>
        <Link
          href={TELEGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          prefetch={false}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-full justify-start gap-2"
          )}
        >
          <MessageCircle className="size-4" />
          Telegram
        </Link>
        <CashierDialog />
      </div>
    </SurfaceCard>
  );
}
