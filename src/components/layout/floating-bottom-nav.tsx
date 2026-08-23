"use client";

import { CashierBottomNavItem } from "@/components/dashboard/cashier-dialog";
import { ADMIN_NAV, USER_NAV, type NavItem } from "@/components/layout/floating-top-nav";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Shield } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function MobileNavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={onClick}
      className={cn(
        "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition",
        active ? "text-orange" : "text-ink/60"
      )}
    >
      <Icon className="size-5 shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function FloatingBottomNav({
  variant = "user",
  isAdmin = false,
}: {
  variant?: "user" | "admin";
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [overflowOpen, setOverflowOpen] = useState(false);
  const isAdminRoute = variant === "admin";

  const cashierActive =
    pathname.startsWith("/dashboard/balance") ||
    pathname.startsWith("/dashboard/payout") ||
    pathname.startsWith("/dashboard/payment");

  function isActive(item: NavItem) {
    if (item.href === "/dashboard") return pathname === "/dashboard";
    if (item.href === "/admin") return pathname.startsWith("/admin");
    return pathname.startsWith(item.href);
  }

  if (isAdminRoute) {
    const primary = ADMIN_NAV.slice(0, 3);
    const overflow = ADMIN_NAV.slice(3);

    return (
      <>
        <nav
          className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="surface-float flex items-stretch gap-0.5 px-1 py-1">
            {primary.map((item) => (
              <MobileNavLink key={item.href} item={item} active={isActive(item)} />
            ))}
            <button
              type="button"
              onClick={() => setOverflowOpen(true)}
              className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-ink/60"
            >
              <MoreHorizontal className="size-5" />
              <span>More</span>
            </button>
          </div>
        </nav>

        <Dialog open={overflowOpen} onOpenChange={setOverflowOpen}>
          <DialogContent className="max-w-sm border-border bg-white">
            <DialogHeader>
              <DialogTitle>Admin menu</DialogTitle>
            </DialogHeader>
            <div className="grid gap-1 pt-2">
              {overflow.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    onClick={() => setOverflowOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                      active
                        ? "bg-orange text-white"
                        : "text-ink/70 hover:bg-orange/10"
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/dashboard"
                prefetch={false}
                onClick={() => setOverflowOpen(false)}
                className="mt-2 flex items-center gap-2 rounded-xl border-t border-border px-3 py-2.5 pt-4 text-sm font-semibold text-ink/50 hover:bg-orange/10"
              >
                User terminal
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <nav
        className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="surface-float flex items-stretch gap-0.5 px-1 py-1">
          <MobileNavLink
            item={USER_NAV[0]}
            active={pathname === "/dashboard"}
          />
          <MobileNavLink
            item={USER_NAV[1]}
            active={pathname.startsWith("/dashboard/packages")}
          />
          <CashierBottomNavItem active={cashierActive} />
          <MobileNavLink
            item={USER_NAV[2]}
            active={pathname.startsWith("/dashboard/settings")}
          />
          {isAdmin && (
            <button
              type="button"
              onClick={() => setOverflowOpen(true)}
              className={cn(
                "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold",
                pathname.startsWith("/admin") ? "text-orange" : "text-ink/60"
              )}
            >
              <Shield className="size-5" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </nav>

      {isAdmin && (
        <Dialog open={overflowOpen} onOpenChange={setOverflowOpen}>
          <DialogContent className="max-w-sm border-border bg-white">
            <DialogHeader>
              <DialogTitle>More</DialogTitle>
            </DialogHeader>
            <Link
              href="/admin"
              prefetch={false}
              onClick={() => setOverflowOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                pathname.startsWith("/admin")
                  ? "bg-orange text-white"
                  : "text-ink/70 hover:bg-orange/10"
              )}
            >
              <Shield className="size-4" />
              Admin
            </Link>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
