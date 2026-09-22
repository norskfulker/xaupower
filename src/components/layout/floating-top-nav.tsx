"use client";

import { MarketStatusBadge } from "@/components/layout/market-status-badge";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { TickerStrip } from "@/components/ticker/ticker-strip";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import type { PriceQuote } from "@/lib/prices";
import {
  Banknote,
  BarChart3,
  Boxes,
  Gift,
  CandlestickChart,
  CreditCard,
  LayoutDashboard,
  Palette,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  match?: (pathname: string) => boolean;
};

export const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/accounts", label: "Accounts", icon: Boxes, match: (p) => p === "/dashboard/accounts" },
  { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
  {
    href: "/admin",
    label: "Admin",
    icon: Shield,
    adminOnly: true,
    match: (p) => p.startsWith("/admin"),
  },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/accounts", label: "Accounts", icon: Boxes },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/signals", label: "Signals", icon: CandlestickChart },
  { href: "/admin/daily", label: "Daily returns", icon: BarChart3 },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/design", label: "Design", icon: Palette },
];

export function isNavActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname);
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  return pathname.startsWith(item.href);
}

function SideNavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active ? "text-orange" : "text-ink/70"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 right-0 h-6 w-0.5 -translate-y-1/2 rounded-full bg-gold"
        />
      ) : null}
    </Link>
  );
}

export function FloatingTopNav({
  variant = "user",
  isAdmin = false,
  homeHref,
  initialQuotes = [],
  fullName,
  email,
  memberLabel,
}: {
  variant?: "user" | "admin";
  isAdmin?: boolean;
  homeHref: string;
  initialQuotes?: PriceQuote[];
  fullName?: string | null;
  email?: string | null;
  memberLabel?: string;
}) {
  const pathname = usePathname();
  const isAdminRoute = variant === "admin";
  const items = isAdminRoute
    ? ADMIN_NAV
    : USER_NAV.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      <aside className="fixed bottom-4 left-4 top-4 z-50 hidden w-56 md:flex">
        <div className="surface-float flex h-full w-full flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border/60 px-4 py-4">
            <Wordmark href={homeHref} className="text-ink" />
          </div>

          <nav className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-3">
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto scrollbar-none">
              {items.map((item) => (
                <SideNavLink
                  key={item.href}
                  item={item}
                  active={isNavActive(pathname, item)}
                />
              ))}
            </div>
            {isAdminRoute && (
              <Link
                href="/dashboard"
                prefetch={false}
                className="relative mt-2 flex w-full shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/50 transition-colors"
              >
                <LayoutDashboard className="size-4 shrink-0" />
                <span className="truncate">Terminal</span>
              </Link>
            )}
          </nav>
        </div>
      </aside>

      <header className="fixed right-4 top-4 z-50 hidden md:block md:left-[15.5rem]">
        <div className="surface-float flex items-center justify-end gap-2 overflow-hidden px-3 py-2.5">
          {!isAdminRoute && <MarketStatusBadge />}
          <TickerStrip tone="light" initialQuotes={initialQuotes} />
          <ProfileMenu
            fullName={fullName}
            email={email}
            memberLabel={memberLabel}
            tone="light"
          />
        </div>
      </header>
    </>
  );
}

export function MobileTopBar({
  homeHref,
  initialQuotes = [],
  fullName,
  email,
  memberLabel,
}: {
  homeHref: string;
  initialQuotes?: PriceQuote[];
  fullName?: string | null;
  email?: string | null;
  memberLabel?: string;
}) {
  return (
    <header className="fixed inset-x-4 top-4 z-50 md:hidden">
      <div className="surface-float flex items-center justify-between gap-2 px-3 py-2.5">
        <Wordmark href={homeHref} className="min-w-0 shrink text-ink" />
        <MarketStatusBadge className="max-w-[7.5rem]" />
        <TickerStrip
          className="min-w-0 shrink"
          tone="light"
          initialQuotes={initialQuotes}
        />
        <ProfileMenu
          fullName={fullName}
          email={email}
          memberLabel={memberLabel}
          tone="light"
        />
      </div>
    </header>
  );
}
