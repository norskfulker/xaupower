import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { TickerStrip } from "@/components/ticker/ticker-strip";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PriceQuote } from "@/lib/prices";

export function LandingHeader({
  user,
  profile,
  authHref,
  quotes,
}: {
  user: { email?: string | null } | null;
  profile: { full_name?: string | null; email?: string | null; role?: string } | null;
  authHref: string;
  quotes: PriceQuote[];
}) {
  return (
    <header className="border-b border-border bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex min-h-14 items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <Wordmark href="/" className="shrink-0 text-ink" />
            <TickerStrip
              className="hidden lg:flex"
              tone="light"
              initialQuotes={quotes}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {user ? (
              <ProfileMenu
                fullName={profile?.full_name}
                email={profile?.email ?? user.email}
                memberLabel={profile?.role === "admin" ? "Admin" : "Member"}
                tone="light"
              />
            ) : (
              <>
                <Link
                  href={authHref}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "hidden min-h-10 text-ink/70 hover:bg-white hover:text-ink sm:inline-flex"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href={authHref}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "min-h-10 bg-orange px-3 text-white hover:bg-orange/90 sm:px-4"
                  )}
                >
                  <span className="hidden sm:inline">Launch Terminal</span>
                  <span className="sm:hidden">Launch</span>
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center border-t border-border py-2.5 lg:hidden">
          <TickerStrip tone="light" initialQuotes={quotes} />
        </div>
      </div>
    </header>
  );
}
