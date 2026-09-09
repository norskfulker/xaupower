"use client";

import Link from "next/link";
import { toast } from "sonner";
import { SurfaceCard } from "@/components/ui/surface-card";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  accessElapsedPct,
  daysRemaining,
  formatUsd,
} from "@/lib/format";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import type { Payment, UserPackage, VariantSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Copy } from "lucide-react";

type BotCardModel = {
  key: string;
  status: "active" | "pending" | "expired";
  accountCode: string | null;
  planLabel: string;
  capital: number;
  available: number;
  pendingUsd: number;
  purchasedAt: string | null;
  expiresAt: string | null;
  botId?: string;
  isPendingPurchase: boolean;
};

function termsFromPayment(payment: Payment): VariantSnapshot | null {
  return resolveUserPackageTerms({
    variant_snapshot: payment.variant_snapshot,
    package_variants: payment.package_variants,
  });
}

export function BotAccountCards({
  bots,
  pendingPurchases = [],
}: {
  bots: UserPackage[];
  pendingPurchases?: Payment[];
}) {
  const pendingCards: BotCardModel[] = pendingPurchases
    .filter((p) => p.kind === "package")
    .filter((p) =>
      ["pending_review", "waiting", "confirming"].includes(p.status)
    )
    .map((p) => {
      const terms = termsFromPayment(p);
      return {
        key: `pending-${p.id}`,
        status: "pending" as const,
        accountCode: null,
        planLabel: packageDisplayLabel(terms) ?? terms?.package_name ?? "New bot",
        capital: Number(p.amount_usd ?? 0),
        available: Number(p.amount_usd ?? 0),
        pendingUsd: 0,
        purchasedAt: p.created_at,
        expiresAt: null,
        isPendingPurchase: true,
      };
    });

  const activeCards: BotCardModel[] = bots.map((bot) => {
    const terms = resolveUserPackageTerms(bot);
    return {
      key: bot.id,
      status: bot.status,
      accountCode: bot.account_code ?? null,
      planLabel: packageDisplayLabel(terms) ?? terms?.package_name ?? "Bot",
      capital: Number(bot.capital_usd ?? 0),
      available: Number(bot.available_usd ?? 0),
      pendingUsd: Number(bot.pending_usd ?? 0),
      purchasedAt: bot.purchased_at,
      expiresAt: bot.expires_at,
      botId: bot.id,
      isPendingPurchase: false,
    };
  });

  const cards = [...pendingCards, ...activeCards];
  const activeCount = activeCards.length;
  const pendingCount = pendingCards.length;

  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-kicker">Your bots</p>
          <h2 className="mt-1 font-display text-2xl tracking-tight text-ink">
            {[
              activeCount > 0
                ? `${activeCount} active bot${activeCount === 1 ? "" : "s"}`
                : null,
              pendingCount > 0 ? `${pendingCount} pending` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </h2>
        </div>
      </div>

      <div
        className={cn(
          "grid items-stretch gap-4 sm:gap-6",
          cards.length > 1 ? "lg:grid-cols-2" : "lg:grid-cols-1"
        )}
      >
        {cards.map((card) => (
          <BotCard key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}

function BotCard({ card }: { card: BotCardModel }) {
  const daysLeft = daysRemaining(card.expiresAt);
  const elapsed = accessElapsedPct(card.purchasedAt, card.expiresAt);

  function copyBotId() {
    if (!card.accountCode) return;
    void navigator.clipboard.writeText(card.accountCode);
    toast.message("Bot ID copied");
  }

  return (
    <SurfaceCard
      padding="lg"
      className={cn(
        "flex h-full flex-col",
        card.isPendingPurchase && "ring-1 ring-orange/35"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg font-black tracking-tight text-orange sm:text-xl">
              {card.accountCode ?? "ID pending"}
            </p>
            {card.accountCode && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0 text-muted-label hover:text-ink"
                onClick={copyBotId}
                aria-label={`Copy bot ID ${card.accountCode}`}
              >
                <Copy className="size-4" />
              </Button>
            )}
          </div>
          <p className="mt-1 truncate text-sm font-semibold text-ink">
            {card.planLabel}
          </p>
        </div>
        <StatusPill status={card.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-kicker">
            {card.isPendingPurchase ? "Amount due" : "Available"}
          </p>
          <p
            className={cn(
              "mt-2 text-xl font-black tabular",
              card.isPendingPurchase
                ? "text-ink"
                : card.available >= 0
                  ? "text-teal"
                  : "text-hotpink"
            )}
          >
            {formatUsd(card.available)}
          </p>
        </div>
        <div className="rounded-2xl bg-canvas p-4">
          <p className="text-kicker">
            {card.isPendingPurchase ? "Plan total" : "Funds"}
          </p>
          <p className="mt-2 text-xl font-black tabular text-ink">
            {formatUsd(card.capital)}
          </p>
        </div>
      </div>

      {!card.isPendingPurchase && card.botId ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href={`/dashboard/cashier?tab=balance&bot=${card.botId}`}
            prefetch={false}
            className={cn(
              buttonVariants({}),
              "h-11 bg-orange text-white hover:bg-orange/90"
            )}
          >
            Add funds
          </Link>
          <Link
            href={`/dashboard/cashier?tab=withdraw&bot=${card.botId}`}
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 border-border bg-canvas text-ink hover:bg-orange/10"
            )}
          >
            Cashout
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-orange/10 px-4 py-3 text-sm text-ink/80">
          Add funds and cashout unlock after approval.
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-kicker">Bot details</p>
        <div className="mt-3 flex justify-between gap-4 text-sm">
          <div>
            <p className="text-muted-label">
              {card.isPendingPurchase ? "Submitted" : "Start"}
            </p>
            <p className="mt-0.5 font-semibold tabular text-ink">
              {card.purchasedAt
                ? format(new Date(card.purchasedAt), "d MMM yyyy")
                : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-label">End</p>
            <p className="mt-0.5 font-semibold tabular text-ink">
              {card.expiresAt
                ? format(new Date(card.expiresAt), "d MMM yyyy")
                : card.isPendingPurchase
                  ? "After approval"
                  : "—"}
            </p>
          </div>
        </div>
        {!card.isPendingPurchase && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted-label">
              <span>Access period</span>
              <span>{daysLeft ?? 0} days remaining</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-canvas">
              <div
                className="h-full rounded-full bg-orange"
                style={{ width: `${elapsed}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}
