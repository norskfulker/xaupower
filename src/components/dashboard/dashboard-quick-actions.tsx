"use client";

import { CashierDialog } from "@/components/dashboard/cashier-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Cpu, MessageCircle } from "lucide-react";
import Link from "next/link";

const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/xaupower";

export function DashboardQuickActions() {
  return (
    <div className="rounded-lg bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-label">
        Quick actions
      </p>
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
      <Link
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block rounded-lg border border-border bg-canvas p-4 transition hover:border-orange/30 hover:bg-orange/5"
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <MessageCircle className="size-4 text-orange" />
          Join VIP Signals on Telegram
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-label">
          VIP membership delivers about 15–20 XAUUSD signals a day. The public
          feed is normally only 1–2 signals per day.
        </p>
      </Link>
    </div>
  );
}
