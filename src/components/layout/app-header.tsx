"use client";

import { ProfileMenu } from "@/components/layout/profile-menu";
import { FloatingBottomNav } from "@/components/layout/floating-bottom-nav";
import {
  FloatingTopNav,
  MobileTopBar,
} from "@/components/layout/floating-top-nav";
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
import { motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

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
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 bg-orange"
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
        className="max-w-md border-border bg-white text-ink"
      >
        <DialogHeader>
          <DialogTitle>
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
  const isAdminRoute = variant === "admin" || pathname.startsWith("/admin");

  useEffect(() => {
    if (userId && !profileComplete) {
      setProfileOpen(true);
    }
  }, [userId, profileComplete]);

  const homeHref = isAdminRoute ? "/admin" : "/dashboard";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <RouteProgress />

      <FloatingTopNav
        variant={isAdminRoute ? "admin" : "user"}
        isAdmin={isAdmin}
        homeHref={homeHref}
        initialQuotes={initialQuotes}
        fullName={fullName}
        email={email}
        memberLabel={memberLabel}
      />

      <MobileTopBar
        homeHref={homeHref}
        initialQuotes={initialQuotes}
        fullName={fullName}
        email={email}
        memberLabel={memberLabel}
      />

      <FloatingBottomNav
        variant={isAdminRoute ? "admin" : "user"}
        isAdmin={isAdmin}
      />

      <main
        className={cn(
          "mx-auto min-w-0 space-y-8 px-4 pb-28 pt-28 md:pb-10 md:pt-32",
          isAdminRoute ? "max-w-7xl sm:px-6 lg:px-8" : "max-w-4xl"
        )}
      >
        {children}
      </main>

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
