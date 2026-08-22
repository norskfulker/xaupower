"use client";

import { CrownMark } from "@/components/brand/crown-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { CashierNavItem } from "@/components/dashboard/cashier-dialog";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { ProfitsTicker } from "@/components/layout/profits-ticker";
import { TickerStrip } from "@/components/ticker/ticker-strip";
import { cn } from "@/lib/utils";
import type { PriceQuote } from "@/lib/prices";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Banknote,
  BarChart3,
  Boxes,
  CandlestickChart,
  CreditCard,
  LayoutDashboard,
  Menu,
  Palette,
  Settings,
  Shield,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
};

const USER_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/packages", label: "Buy Bot", icon: Boxes },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

function NavLinks({
  isAdmin,
  onNavigate,
}: {
  isAdmin?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = USER_NAV.filter((item) => !item.adminOnly || isAdmin);
  const cashierActive =
    pathname.startsWith("/dashboard/balance") ||
    pathname.startsWith("/dashboard/payout") ||
    pathname.startsWith("/dashboard/payment");

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : item.href === "/admin"
              ? pathname.startsWith("/admin")
              : pathname.startsWith(item.href);
        const Icon = item.icon;
        if (item.href === "/dashboard/packages") {
          return (
            <div key={item.href} className="contents">
              <Link
                href={item.href}
                prefetch={false}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-orange text-white"
                    : "text-ink/70 hover:bg-orange/10 hover:text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
              <CashierNavItem onNavigate={onNavigate} active={cashierActive} />
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              item.adminOnly && "mt-3 border-t border-border pt-4",
              active
                ? "bg-orange text-white"
                : "text-ink/70 hover:bg-orange/10 hover:text-ink"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

const ADMIN_NAV: NavItem[] = [
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

function AdminNavLinks({
  onNavigate,
  onProfile,
}: {
  onNavigate?: () => void;
  onProfile: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {ADMIN_NAV.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-orange text-white"
                : "text-ink/70 hover:bg-orange/10 hover:text-ink"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard"
        prefetch={false}
        onClick={onNavigate}
        className="mt-3 flex items-center gap-2 rounded-lg border-t border-border px-3 py-2 pt-4 text-sm font-medium text-ink/50 transition hover:bg-orange/10 hover:text-ink"
      >
        <LayoutDashboard className="size-4 shrink-0" />
        User terminal
      </Link>
      <button
        type="button"
        onClick={() => {
          onProfile();
          onNavigate?.();
        }}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink/70 transition hover:bg-orange/10 hover:text-ink"
      >
        <User className="size-4" />
        Profile
      </button>
    </nav>
  );
}

function RouteProgress() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const t = window.setTimeout(() => setActive(false), 420);
    return () => window.clearTimeout(t);
  }, [pathname]);

  if (reduce) return null;

  return (
    <motion.div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 bg-orange"
      style={{ originX: 0 }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: active ? 1 : 0 }}
      transition={{ duration: active ? 0.4 : 0.2, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

function ProfileDialog({
  open,
  onOpenChange,
  required,
  userId,
  initialName,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required: boolean;
  userId: string;
  initialName: string;
  email?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fullName = name.trim();
    if (!fullName) {
      setError("Enter your full name to continue");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", userId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (required && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!required}
        className="max-w-md border-border bg-white p-6 text-ink sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-ink">
            {required ? "Complete your profile" : "Profile"}
          </DialogTitle>
          <DialogDescription className="text-muted-label">
            {required
              ? "Add your name before using the terminal."
              : "Update the name shown on your account."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={email ?? ""}
              disabled
              className="border-border bg-canvas text-ink"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-border bg-canvas text-ink"
              placeholder="Your name"
            />
          </div>
          {error && <p className="text-sm text-hotpink">{error}</p>}
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-orange text-white hover:bg-orange/90"
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SidebarBrand({ href }: { href: string }) {
  return (
    <Link href={href} prefetch={false} className="flex items-center gap-3">
      <CrownMark />
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-tight text-ink">
          XAU<span className="text-orange">Power</span>
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-orange">
          Gold trading
        </span>
      </span>
    </Link>
  );
}

function TopBarProfile({
  fullName,
  memberLabel,
  email,
  initialQuotes = [],
}: {
  fullName?: string | null;
  memberLabel: string;
  email?: string | null;
  initialQuotes?: PriceQuote[];
}) {
  return (
    <div className="flex h-full items-center justify-between gap-3">
      <TickerStrip
        className="min-w-0"
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
  );
}

export function AppHeader({
  variant = "user",
  email,
  fullName,
  userId,
  isAdmin = false,
  memberLabel = "Member",
  initialQuotes = [],
  children,
}: {
  variant?: "user" | "admin";
  email?: string | null;
  fullName?: string | null;
  userId?: string;
  isAdmin?: boolean;
  memberLabel?: string;
  initialQuotes?: PriceQuote[];
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const profileComplete = Boolean(fullName?.trim());
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdminRoute = variant === "admin" || pathname.startsWith("/admin");

  useEffect(() => {
    if (userId && !profileComplete) {
      setProfileOpen(true);
    }
  }, [userId, profileComplete]);

  const homeHref = isAdminRoute ? "/admin" : "/dashboard";

  const sidebar = (
    <>
      <div className="flex h-20 items-center border-b border-border px-4">
        <SidebarBrand href={homeHref} />
      </div>
      {isAdmin && isAdminRoute && (
        <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-orange">
          Admin access
        </p>
      )}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-label">
          Menu
        </p>
        {isAdminRoute ? (
          <AdminNavLinks
            onNavigate={() => setMobileOpen(false)}
            onProfile={() => setProfileOpen(true)}
          />
        ) : (
          <NavLinks
            isAdmin={isAdmin}
            onNavigate={() => setMobileOpen(false)}
          />
        )}
      </div>
      <div className="border-t border-border p-3">
        {isAdminRoute ? (
          <SignOutButton tone="light" />
        ) : (
          <ProfileMenu
            fullName={fullName}
            email={email}
            memberLabel={memberLabel}
            tone="light"
            align="start"
          />
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <RouteProgress />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-white md:flex">
        {sidebar}
      </aside>

      <div className="md:pl-60">
        <header className="border-b border-border bg-white">
          <div className="flex h-16 items-center gap-3 px-4 md:px-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-ink hover:bg-ink/5 md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <Wordmark href={homeHref} className="md:hidden" />
            <div
              className={cn(
                "mx-auto w-full",
                isAdminRoute ? "px-2 sm:px-6" : "md:w-[70%]"
              )}
            >
              <TopBarProfile
                fullName={fullName}
                memberLabel={memberLabel}
                email={email}
                initialQuotes={initialQuotes}
              />
            </div>
          </div>
        </header>
        {!isAdminRoute && <ProfitsTicker />}

        <main
          className={cn(
            "min-w-0 space-y-8 bg-canvas py-8",
            isAdminRoute ? "px-4 sm:px-6 lg:px-8" : "px-4 md:px-0"
          )}
        >
          <div
            className={cn(
              "space-y-8",
              !isAdminRoute && "mx-auto w-full md:w-[70%]"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 border-0 bg-white p-0 text-ink sm:max-w-xs"
        >
          <div className="flex h-full flex-col">{sidebar}</div>
        </SheetContent>
      </Sheet>

      {userId && (
        <ProfileDialog
          open={profileOpen || !profileComplete}
          onOpenChange={(open) => {
            if (!profileComplete && !open) return;
            setProfileOpen(open);
          }}
          required={!profileComplete}
          userId={userId}
          initialName={fullName?.trim() ?? ""}
          email={email}
        />
      )}
    </div>
  );
}
