"use client";

import { SurfaceCard } from "@/components/ui/surface-card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, MessageCircle } from "lucide-react";
import Link from "next/link";

const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/xaupowersignals";

export function DashboardQuickActions() {
  return (
    <SurfaceCard>
      <h2 className="font-display text-lg text-ink">Quick actions</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <a
          href="#accounts"
          className={cn(
            buttonVariants({}),
            "h-11 w-full justify-start gap-2 bg-orange text-white hover:bg-orange/90"
          )}
        >
          <ArrowDownLeft className="size-4" />
          Deposit
        </a>
        <a
          href="#accounts"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-full justify-start gap-2"
          )}
        >
          <ArrowUpRight className="size-4" />
          Withdraw
        </a>
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
      </div>
    </SurfaceCard>
  );
}