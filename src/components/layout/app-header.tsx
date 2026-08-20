import { Wordmark } from "@/components/brand/wordmark";
import { TickerStrip } from "@/components/ticker/ticker-strip";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

export function AppHeader({
  variant = "user",
  email,
}: {
  variant?: "user" | "admin";
  email?: string | null;
}) {
  return (
    <header
      className={cn(
        "border-b border-white/10 bg-ink text-white",
        variant === "admin" && "sticky top-0 z-40"
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Wordmark href={variant === "admin" ? "/admin" : "/dashboard"} />
          {variant === "admin" && (
            <span className="rounded bg-orange/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-orange">
              Admin
            </span>
          )}
          <TickerStrip className="hidden md:flex" />
        </div>
        <div className="flex items-center gap-3 text-sm text-white/70">
          {email && <span className="hidden sm:inline">{email}</span>}
          <SignOutButton />
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-2 md:hidden sm:px-6">
        <TickerStrip />
      </div>
    </header>
  );
}
