import { getAuthUser, getOwnProfile, getPriceQuotes } from "@/lib/supabase/server";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingPriceChart } from "@/components/landing/landing-price-chart";
import { LandingStickyBar } from "@/components/landing/landing-sticky-bar";
import { LandingPerformanceTable } from "@/components/landing/landing-tables";
import { SurfaceCard } from "@/components/ui/surface-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Brain,
  Check,
  Crosshair,
  MessageCircle,
  Scale,
  Target,
  Wallet,
} from "lucide-react";

export const metadata = {
  title: "XAUPower — Emotionless Gold Trading Bot",
  description:
    "Stop losing to fear and hesitation. XAUPower executes XAU/USD with no emotions, zero rule-breaking mistakes, and full capital utilization on cloud VPS.",
};

const TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_URL ?? "https://t.me/xaupower";

const ctaPrimary = cn(
  buttonVariants({ size: "lg" }),
  "h-12 w-full bg-orange text-white hover:bg-orange/90 sm:h-11 sm:w-auto sm:min-w-[12rem]"
);

const ctaSecondary = cn(
  buttonVariants({ variant: "outline", size: "lg" }),
  "h-12 w-full border-border bg-white sm:h-11 sm:w-auto sm:min-w-[10rem]"
);

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "No emotions",
    body: "Fear, greed, and revenge trading never touch an entry. The bot follows the plan — not your pulse.",
    icon: Brain,
  },
  {
    title: "Zero rule mistakes",
    body: "Stops, targets, and size rules fire the same way every time. No skipped exits. No “just this once.”",
    icon: Crosshair,
  },
  {
    title: "Full capital utilization",
    body: "Idle cash waiting on hesitation costs you. The engine stays on the market so capital works when setups appear.",
    icon: Wallet,
  },
  {
    title: "Built against the fear of losing",
    body: "Manual traders freeze at the worst moments. Automation removes the freeze — entries and exits stay disciplined.",
    icon: Scale,
  },
];

const STEPS = [
  {
    n: "01",
    title: "Buy a Bot Plan",
    body: "Choose your risk term and unlock VPS bot access for your account.",
  },
  {
    n: "02",
    title: "Bot executes without emotion",
    body: "Trades run to the profit target and risk rules — or you follow our signals. No hesitation.",
  },
  {
    n: "03",
    title: "Withdraw after closed trades",
    body: "When a trade closes, take profit from Cashier. Your capital stays under your control.",
  },
] as const;

const PERFORMANCE = [
  {
    period: "Last 7 days",
    trades: "48",
    winRate: "62%",
    pips: "+184",
    result: "Strong",
  },
  {
    period: "Last 30 days",
    trades: "196",
    winRate: "58%",
    pips: "+612",
    result: "Steady",
  },
  {
    period: "Last 90 days",
    trades: "540",
    winRate: "57%",
    pips: "+1,480",
    result: "Compounding",
  },
];

export default async function HomePage() {
  const user = await getAuthUser();
  const profile = user ? await getOwnProfile(user.id) : null;
  const authHref = user ? "/dashboard" : "/login";
  const quotes = await getPriceQuotes();
  const xauQuote = quotes.find((q) => q.pair === "XAUUSD") ?? null;

  return (
    <div className="min-h-screen bg-canvas pt-28 text-ink pb-[calc(8rem+env(safe-area-inset-bottom,0px))] sm:pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <LandingHeader
        user={user}
        profile={profile}
        authHref={authHref}
        quotes={quotes}
      />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col gap-5 text-center sm:gap-6 lg:text-left">
            <p className="text-kicker inline-flex items-center justify-center gap-2 self-center text-orange lg:self-start">
              <Target className="size-3.5 shrink-0" /> Fear of losing ends here
            </p>
            <h1 className="text-display">
              Stop losing to
              <br />
              emotion
            </h1>
            <p className="text-lg font-bold leading-snug tracking-tight text-orange sm:text-xl">
              A gold bot that executes with no emotions, zero mistakes, and full
              utilization of your capital.
            </p>
            <p className="mx-auto max-w-lg text-sm leading-relaxed text-muted-label sm:text-base lg:mx-0">
              Most traders don’t lose because the market is “impossible” — they
              lose because fear freezes entries, greed stretches exits, and
              capital sits idle. XAUPower runs the rules so you don’t have to.
            </p>
          </div>

          <div className="w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <LandingPriceChart initialQuote={xauQuote} />
          </div>

          <div className="flex flex-col gap-5 text-center lg:col-start-1 lg:row-start-2 lg:text-left">
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start">
              <Link href={authHref} className={ctaPrimary}>
                <Bot className="size-4 shrink-0" />
                Start Automated Bot
                <ArrowRight className="size-4 shrink-0" />
              </Link>
              <Link
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={ctaSecondary}
              >
                <MessageCircle className="size-4 shrink-0" />
                Join Telegram
              </Link>
            </div>
            <ul className="grid gap-2 text-left text-xs text-muted-label sm:mx-auto sm:max-w-md sm:text-sm lg:mx-0 lg:max-w-none">
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-teal" /> No emotional
                entries or exits
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-teal" /> Rules applied the
                same every trade
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-teal" /> Capital working
                when the market opens
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="mx-auto max-w-7xl border-t border-border px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="text-center">
          <p className="text-kicker text-orange">Why the bot wins</p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            Built to beat fear — not chase hype
          </h2>
        </div>
        <ul className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
          {FEATURES.map(({ title, body, icon: Icon }) => (
            <li key={title}>
              <SurfaceCard className="flex h-full flex-col gap-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-orange/10 text-orange">
                  <Icon className="size-5" />
                </span>
                <h3 className="text-lg font-bold leading-snug text-ink">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-label">{body}</p>
              </SurfaceCard>
            </li>
          ))}
        </ul>
      </section>

      {/* STEPS */}
      <section
        id="steps"
        className="mx-auto max-w-7xl border-t border-border px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="text-center">
          <p className="text-kicker text-orange">3 steps</p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            From fear to automated execution
          </h2>
        </div>
        <ol className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <li key={n}>
              <SurfaceCard className="flex h-full min-h-[12rem] flex-col">
                <p className="text-kicker text-orange">{n}</p>
                <h3 className="mt-3 text-lg font-bold leading-snug text-ink">
                  {title}
                </h3>
                <p className="mt-auto pt-4 text-sm leading-relaxed text-muted-label">
                  {body}
                </p>
              </SurfaceCard>
            </li>
          ))}
        </ol>
      </section>

      {/* PAST PERFORMANCE */}
      <section
        id="performance"
        className="mx-auto max-w-7xl border-t border-border px-4 py-12 sm:px-6 sm:py-16"
      >
        <div className="text-center">
          <p className="text-kicker text-orange">Past performance</p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            What disciplined execution looks like
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-label">
            Illustrative feed metrics from closed bot sessions. Past results do
            not guarantee future performance.
          </p>
        </div>
        <div className="mt-8 sm:mt-10">
          <LandingPerformanceTable rows={PERFORMANCE} />
        </div>
      </section>

      {/* FOOTER */}
      <footer id="risk" className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 text-center sm:gap-8 sm:px-6 sm:py-10">
          <div>
            <Wordmark href="/" className="text-ink" />
            <p className="mt-2 text-sm text-muted-label">
              Emotionless gold execution
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {[
              ["/", "Home"],
              ["#features", "Features"],
              ["#steps", "Steps"],
              ["#performance", "Performance"],
              ["#risk", "Risk"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-label hover:text-ink"
              >
                {label}
              </Link>
            ))}
            <Link
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-label hover:text-ink"
            >
              Telegram
            </Link>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="text-sm text-muted-label hover:text-ink"
            >
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
        <p className="mx-auto max-w-3xl px-4 pb-6 text-center text-xs leading-relaxed text-muted-label sm:px-6 sm:pb-8">
          Risk Disclaimer: Trading XAU/USD on margin carries high risk and may
          not be suitable for all investors. Automated software cannot eliminate
          slippage, volatility, or black-swan events. Past algorithmic returns do
          not guarantee future performance. © 2026 XAUPower.
        </p>
      </footer>

      <LandingStickyBar authHref={authHref} telegramUrl={TELEGRAM_URL} />
    </div>
  );
}
