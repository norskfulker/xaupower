import { createClient, getAuthUser, getOwnProfile, getPriceQuotes } from "@/lib/supabase/server";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { PackagesGrid } from "@/components/packages/packages-grid";
import { CountryFlags } from "@/components/landing/country-flags";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingPriceChart } from "@/components/landing/landing-price-chart";
import { LandingStickyBar } from "@/components/landing/landing-sticky-bar";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WEEKLY_PROFIT_PCT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Package } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bot,
  Check,
  Clock,
  Cloud,
  Cpu,
  Globe,
  Lock,
  MessageCircle,
  Server,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";

export const metadata = {
  title: "XAUPower — Automated Gold (XAU/USD) Execution Bot",
  description:
    "Automated XAU/USD trading bot hosted on dedicated cloud VPS. Pay fixed setup signal fees, fund your account, and withdraw your balance anytime.",
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

const FAQS = [
  {
    q: "What is XAUPower and how does it execute trades?",
    a: "XAUPower is an automated trading bot specifically designed for XAU/USD (Gold). It runs on custom-managed Cloud VPS servers. Once connected, the bot receives algorithmic signals and automatically places and manages trades on your connected account.",
  },
  {
    q: "How does payment and pricing work?",
    a: "You only pay a nominal one-time setup fee per term ($50 Nominal, $100 Standard, $200 Aggressive) to unlock bot access and signal execution. Your trading capital is separate.",
  },
  {
    q: "Can I withdraw my trading balance whenever I want?",
    a: "Yes. Your trading capital remains yours. You can deposit your chosen initial balance and withdraw your principal or profit at any time without lockup periods.",
  },
  {
    q: "Do I need to keep my laptop or computer open?",
    a: "No. The entire system is hosted on high-speed, dedicated Virtual Private Servers (VPS) with 99.9% uptime. Trades execute automatically in milliseconds regardless of whether your devices are online.",
  },
  {
    q: "How does the bot manage risk?",
    a: "The bot trades on algorithmic triggers including 50 EMA crossovers, 16-Cross MA, and liquidity sweep levels. You select your risk profile (Nominal, Standard, or Aggressive), capping total exposure and limiting maximum daily executions (up to 20 trades/day).",
  },
];

export default async function HomePage() {
  const supabase = createClient();
  const user = await getAuthUser();
  const profile = user ? await getOwnProfile(user.id) : null;
  const authHref = user ? "/dashboard" : "/login";

  const { data } = await supabase
    .from("packages")
    .select("*")
    .eq("is_active", true)
    .order("price_usd");

  const packages = (data ?? []) as Package[];
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

      {/* HERO — mobile: headline → chart → copy → CTAs */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="flex flex-col gap-5 text-center sm:gap-6 lg:text-left">
            <p className="text-kicker inline-flex items-center justify-center gap-2 self-center lg:self-start">
              <Cloud className="size-3.5 shrink-0" /> Cloud VPS Auto-Execution
            </p>
            <h1 className="text-display">
              Automated Gold
              <br />
              Trading Engine
            </h1>
            <p className="text-lg font-bold leading-snug tracking-tight text-orange sm:text-xl">
              Plug into the VPS. Pay for signals. We execute the trades.
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
                <Check className="size-4 shrink-0 text-teal" /> Instant VPS
                activation
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-teal" /> Full balance
                control
              </li>
              <li className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-teal" /> Withdraw anytime
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          <StatCard icon={Server} kicker="24/7 VPS" label="Dedicated execution host" />
          <StatCard icon={TrendingUp} kicker="XAU/USD" label="Specialized gold algorithm" />
          <StatCard icon={Wallet} kicker="$50+" label="Fixed setup signal fee" />
          <StatCard icon={Clock} kicker="Anytime" label="Instant deposit & withdrawal" />
        </div>
        <Card className="mt-8 border-border/80 bg-white/60">
          <CardContent className="py-4 text-center text-sm text-muted-label">
            Trades execute automatically across London and New York volatility
            windows via VPS. Trading gold carries inherent market risk. Past
            algorithmic performance does not guarantee future results.
          </CardContent>
        </Card>
      </section>

      {/* SYSTEM OVERVIEW */}
      <section className="mx-auto max-w-7xl border-t border-border px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-kicker text-orange">System Overview</p>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
            Designed for hands-free precision
          </h2>
        </div>
        <div className="mx-auto mt-8 w-full max-w-md sm:mt-10">
          <SetupCard />
        </div>
      </section>

      {/* GLOBAL REACH */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Card className="w-full text-center">
          <CardHeader className="px-4 sm:px-6">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange/10">
              <Globe className="size-6 text-orange" />
            </div>
            <CardTitle className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              18+ countries worldwide
            </CardTitle>
            <CardDescription>Connected accounts across the globe</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-5 sm:px-6">
            <CountryFlags className="flex flex-wrap justify-center gap-2" />
          </CardContent>
        </Card>
      </section>

      {/* HOW IT WORKS */}
      <section id="learn" className="mx-auto max-w-7xl border-t border-border px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
            Automated Workflow
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            How the bot executes your trades
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2">
          <LearnBlock
            icon={<Zap className="size-5 text-orange" />}
            title="1. Algorithmic Signals"
            body="Monitors 50 EMA, 16-Cross MA, and institutional liquidity sweeps to isolate high-probability gold setups."
          />
          <LearnBlock
            icon={<Cpu className="size-5 text-orange" />}
            title="2. Dedicated VPS Hosting"
            body="Runs on isolated VPS hardware — no local latency, device dependencies, or network outages."
          />
          <LearnBlock
            icon={<Lock className="size-5 text-orange" />}
            title="3. Fixed Setup Signal Fee"
            body="Flat setup fee ($50 Nominal, $100 Standard, or $200 Aggressive) keeps your bot active for the term."
          />
          <LearnBlock
            icon={<Wallet className="size-5 text-orange" />}
            title="4. Total Capital Freedom"
            body="Maintain your trade balance separately. Add funds or withdraw your balance whenever you choose."
          />
        </div>
      </section>

      {/* ONBOARDING STEPS */}
      <section id="community" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
            Quick Onboarding
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            4 steps to start auto-trading
          </h2>
        </div>
        <ol className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
          <FeedStep
            n="01"
            title="Select Risk Level"
            body="Choose Nominal, Standard, or Aggressive based on your target return profile."
          />
          <FeedStep
            n="02"
            title="Pay Setup Fee"
            body="Cover the signal setup charge to provision your bot on the execution network."
          />
          <FeedStep
            n="03"
            title="Fund Your Account"
            body="Deposit your trading capital into your secure terminal environment."
          />
          <FeedStep
            n="04"
            title="Auto-Execute & Control"
            body="The VPS handles execution 24/5. Track trades live and withdraw anytime."
          />
        </ol>
        <div className="mt-8 flex w-full flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:justify-center">
          <Link href={authHref} className={ctaPrimary}>
            Connect Account Now
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
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
            Trader Feedback
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            What users say about automated execution
          </h2>
        </div>
        <div className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-3">
          <Quote
            body="Not having to sit in front of charts all day during London session was the big game-changer. The VPS handles entries instantly without emotion."
            who="Automated Plan User"
          />
          <Quote
            body="I was skeptical about automated tools, but having direct access to withdraw my profits and capital at any point gave me full peace of mind."
            who="Standard Package Trader"
          />
          <Quote
            body="The risk terms make complete sense. Setups run clean on 50 EMA liquidity grabs with strict stops built-in."
            who="Aggressive Term User"
          />
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl border-t border-border px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
            System Features
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            Built for reliability & control
          </h2>
        </div>
        <ul className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {(
            [
              ["Hosted VPS Execution", "Zero device overhead. Dedicated server hosts your bot.", Server],
              ["Signal-Based Packages", "Transparent, fixed setup fees based on your risk term.", Shield],
              ["Zero Management Stress", "Automated entries, stop-losses, and multi-tier take-profits.", Bot],
              ["Instant Withdrawals", "Your capital is never locked. Deposit and withdraw on demand.", Wallet],
              ["Strict Risk Rules", "Limits execution up to 20 high-confluence trades per day.", Lock],
              ["24/5 Market Monitoring", "Constant coverage of London and New York gold sessions.", Clock],
            ] as const satisfies ReadonlyArray<[string, string, LucideIcon]>
          ).map(([title, body, Icon]) => (
            <li key={title}>
              <Card className="h-full min-h-[8.5rem] w-full">
                <CardHeader className="flex-row items-start gap-3 space-y-0 px-4 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-teal/10">
                    <Icon className="size-4 text-teal" />
                  </span>
                  <div className="min-w-0 text-left">
                    <CardTitle className="text-base leading-snug">{title}</CardTitle>
                    <CardDescription className="mt-1.5 leading-relaxed">{body}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      {/* PACKAGES */}
      <section id="plans" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
            Signal Setup Terms
          </p>
          <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            Select setup term & risk profile
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-label">
            Setup fees unlock full VPS bot execution. Aggressive settings target
            up to {WEEKLY_PROFIT_PCT.aggressive}% per week with dynamic risk
            management.
          </p>
        </div>
        <div className="mt-8">
          <PackagesGrid
            packages={packages}
            ctaHref={authHref}
            ctaLabel="Activate Bot"
          />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
            Questions
          </p>
          <h2 className="mx-auto mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            Frequently asked questions
          </h2>
        </div>
        <Card className="mt-8 w-full overflow-hidden sm:mt-10">
          <CardContent className="divide-y divide-border p-0">
            {FAQS.map((item) => (
              <details key={item.q} className="group px-4 py-1 sm:px-6">
                <summary className="flex min-h-12 cursor-pointer list-none items-center py-3 text-left text-sm font-semibold marker:content-none sm:text-base">
                  <span className="flex w-full items-center justify-between gap-4">
                    <span className="pr-2">{item.q}</span>
                    <span className="shrink-0 text-lg text-muted-label group-open:hidden">
                      +
                    </span>
                    <span className="hidden shrink-0 text-lg text-muted-label group-open:inline">
                      −
                    </span>
                  </span>
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted-label">
                  {item.a}
                </p>
              </details>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-20">
        <Card className="w-full bg-gradient-to-b from-card to-orange/5">
          <CardHeader className="px-4 text-center sm:px-6">
            <CardDescription className="text-xs font-semibold uppercase tracking-[0.2em]">
              Ready to Start?
            </CardDescription>
            <CardTitle className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
              Automate your XAU/USD trading today
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-6 text-center sm:px-6">
            <p className="mx-auto max-w-lg text-sm text-muted-label sm:text-base">
              Connect your account, choose your setup term, and let the VPS
              execution engine handle gold market opportunities for you.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:justify-center">
              <Link href={authHref} className={ctaPrimary}>
                <Bot className="size-4 shrink-0" />
                Launch XAUPower Bot
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
            <p className="mt-4 text-xs text-muted-label">
              Fast terminal setup · Full balance withdrawal access · Cloud VPS
              connected
            </p>
          </CardContent>
        </Card>
      </section>

      {/* FOOTER */}
      <footer id="risk" className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-8 text-center sm:gap-8 sm:px-6 sm:py-10">
          <div>
            <Wordmark href="/" className="text-ink" />
            <p className="mt-2 text-sm text-muted-label">Automated Execution Network</p>
          </div>
          <nav className="grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
            {[
              ["/", "Home"],
              ["#learn", "Architecture"],
              ["#plans", "Packages"],
              ["#faq", "FAQ"],
              ["#risk", "Risk Disclosure"],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm text-muted-label hover:bg-ink/5 hover:text-ink sm:min-h-0 sm:px-0 sm:hover:bg-transparent"
              >
                {label}
              </Link>
            ))}
            <Link
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm text-muted-label hover:bg-ink/5 hover:text-ink sm:min-h-0 sm:px-0 sm:hover:bg-transparent"
            >
              Telegram
            </Link>
            <Link
              href={user ? "/dashboard/settings" : "/login"}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-2 text-sm text-muted-label hover:bg-ink/5 hover:text-ink sm:min-h-0 sm:px-0 sm:hover:bg-transparent"
            >
              {user ? "Open profile" : "Sign in"}
            </Link>
          </nav>
        </div>
        <p className="mx-auto max-w-3xl px-4 pb-6 text-center text-xs leading-relaxed text-muted-label sm:px-6 sm:pb-8">
          Risk Disclaimer: Trading foreign exchange and spot commodities (XAU/USD)
          on margin carries high risk and may not be suitable for all investors.
          Automated trading software is designed to execute trades based on
          predetermined parameters but cannot eliminate market slippage, volatility
          risks, or systemic black swan events. You retain full control over your
          balance and can request withdrawals subject to standard processor
          processing times. Past algorithmic returns do not guarantee future
          performance. © 2026 XAUPower.
        </p>
      </footer>

      <LandingStickyBar authHref={authHref} telegramUrl={TELEGRAM_URL} />
    </div>
  );
}

function StatCard({
  icon: Icon,
  kicker,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  kicker: string;
  label: string;
}) {
  return (
    <Card className="h-full min-h-[11.5rem] w-full text-center sm:min-h-[12.5rem]">
      <CardContent className="flex h-full flex-col items-center px-4 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
        <span className="flex size-10 items-center justify-center rounded-xl bg-orange/10">
          <Icon className="size-5 text-orange" />
        </span>
        <p className="text-metric mt-4 text-orange">{kicker}</p>
        <p className="mt-auto pt-3 text-sm leading-snug text-muted-label">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

function LearnBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="h-full min-h-[9rem] w-full">
      <CardHeader className="flex-row items-start gap-3 space-y-0 px-4 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-orange/10">
          {icon}
        </span>
        <div className="min-w-0 text-left">
          <CardTitle className="text-base leading-snug sm:text-lg">{title}</CardTitle>
          <CardDescription className="mt-2 leading-relaxed">{body}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  );
}

function FeedStep({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <li>
      <Card className="h-full min-h-[12rem] w-full text-center">
        <CardContent className="flex h-full flex-col px-4 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
          <p className="text-sm font-bold tabular text-orange">{n}</p>
          <h3 className="mt-3 text-lg font-bold leading-snug">{title}</h3>
          <p className="mx-auto mt-auto max-w-xs pt-3 text-sm leading-relaxed text-muted-label">
            {body}
          </p>
        </CardContent>
      </Card>
    </li>
  );
}

function Quote({ body, who }: { body: string; who: string }) {
  return (
    <figure className="h-full">
      <Card className="h-full min-h-[14rem] w-full">
        <CardContent className="flex h-full flex-col px-4 pb-6 pt-6 sm:px-6 sm:pb-7 sm:pt-7">
          <blockquote className="text-sm leading-relaxed text-ink/80">
            &ldquo;{body}&rdquo;
          </blockquote>
          <figcaption className="mt-auto flex items-center justify-center gap-3 pt-6 text-xs text-muted-label">
            <span className="flex size-8 items-center justify-center rounded-full bg-orange text-[11px] font-black text-white">
              X
            </span>
            {who}
          </figcaption>
        </CardContent>
      </Card>
    </figure>
  );
}

function SetupCard() {
  const rows = [
    ["VPS Node Status", "Connected (0.4ms)"],
    ["Strategy Engine", "50 EMA / Liquidity Grab"],
    ["Max Daily Trades", "20 Executions"],
    ["Auto SL/TP Management", "Active"],
    ["Capital Protection Mode", "Enabled"],
  ];
  return (
    <Card className="w-full">
      <CardHeader className="flex-col gap-3 space-y-0 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-black text-gold">
            X
          </span>
          <div className="min-w-0 text-left">
            <CardTitle className="text-sm">XAUPower Bot Terminal</CardTitle>
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className="size-1.5 animate-ping rounded-full bg-emerald-500" />{" "}
              Live VPS Sync
            </p>
          </div>
        </div>
        <span className="w-fit self-start rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase text-emerald-600 sm:self-center">
          Auto Engine
        </span>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-label">
          XAU/USD VPS Configuration
        </p>
        <dl className="mt-3 space-y-2">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
            >
              <dt className="text-muted-label">{label}</dt>
              <dd className="font-extrabold tabular text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted-label">
          Automated trade execution parameters active 24/5 on cloud hosting.
        </p>
      </CardContent>
    </Card>
  );
}
