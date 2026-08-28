"use client";

import { CashierNavItem } from "@/components/dashboard/cashier-dialog";
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
  CandlestickChart,
  CreditCard,
  LayoutDashboard,
  Palette,
  Settings,
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
  { href: "/dashboard/packages", label: "Buy Bot", icon: Boxes },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
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
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/payouts", label: "Payouts", icon: Banknote },
  { href: "/admin/signals", label: "Signals", icon: CandlestickChart },
  { href: "/admin/packages", label: "Packages", icon: Boxes },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings/wallets", label: "Wallets", icon: Wallet },
  { href: "/admin/design", label: "Design", icon: Palette },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match) return item.match(pathname);
  if (item.href === "/dashboard") return pathname === "/dashboard";
  if (item.href === "/admin") return pathname.startsWith("/admin");
  return pathname.startsWith(item.href);
}

function NavPill({
  item,
  active,
  compact,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition",
        compact && "px-2.5 py-1.5 text-xs",
        active
          ? "bg-orange text-white shadow-sm"
          : "text-ink/70 hover:bg-orange/10 hover:text-ink"
      )}
    >
      <Icon className={cn("shrink-0", compact ? "size-3.5" : "size-4")} />
      <span className={compact ? "hidden xl:inline" : undefined}>{item.label}</span>
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

  const cashierActive =
    pathname.startsWith("/dashboard/cashier") ||
    pathname.startsWith("/dashboard/balance") ||
    pathname.startsWith("/dashboard/payout") ||
    pathname.startsWith("/dashboard/payment");

  return (
    <header className="fixed inset-x-4 top-4 z-50 mx-auto hidden max-w-6xl md:block">
      <div className="surface-float overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <Wordmark href={homeHref} className="shrink-0 text-ink" />
          <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {items.map((item) => (
              <NavPill
                key={item.href}
                item={item}
                active={isActive(pathname, item)}
                compact={isAdminRoute}
              />
            ))}
            {!isAdminRoute && (
              <CashierNavItem active={cashierActive} pill />
            )}
            {isAdminRoute && (
              <Link
                href="/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-ink/50 transition hover:bg-orange/10 hover:text-ink"
              >
                <LayoutDashboard className="size-3.5" />
                <span className="hidden xl:inline">Terminal</span>
              </Link>
            )}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {!isAdminRoute && <MarketStatusBadge />}
            <TickerStrip tone="light" initialQuotes={initialQuotes} />
            <ProfileMenu
              fullName={fullName}
              email={email}
              memberLabel={memberLabel}
              tone="light"
            />
          </div>
        </div>
      </div>
    </header>
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
