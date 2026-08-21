import { createClient, getAuthUser, getOwnProfile, getPriceQuotes } from "@/lib/supabase/server";
import Link from "next/link";
import { Wordmark } from "@/components/brand/wordmark";
import { TickerStrip } from "@/components/ticker/ticker-strip";
import { PackagesGrid } from "@/components/packages/packages-grid";
import { CountryFlags } from "@/components/landing/country-flags";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { buttonVariants } from "@/components/ui/button";
import { WEEKLY_PROFIT_PCT } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Package } from "@/lib/types";
import { ArrowRight, Check, Cpu, Lock, Wallet, Zap } from "lucide-react";

export const metadata = {
  title: "XAUPower — Automated Gold (XAU/USD) Execution Bot",
  description:
    "Automated XAU/USD trading bot hosted on dedicated cloud VPS. Pay fixed setup signal fees, fund your account, and withdraw your balance anytime.",
};

const MARQUEE = [
  "XAU/USD AUTOMATED TRADING",
  "DEDICATED CLOUD VPS HOSTING",
  "NO MANUAL INTERVENTION",
  "LIQUIDITY & 50 EMA STRATEGY",
  "PAY PER SIGNAL PACKAGE",
  "WITHDRAW BALANCES ANYTIME",
  "AUTOMATED RISK CONTROL",
  "18+ COUNTRIES ACTIVE",
];

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

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-border bg-canvas">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Wordmark href="/" className="text-ink" />
            <span className="hidden items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-label sm:inline-flex">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Automated VPS Engine
            </span>
            <TickerStrip
              className="hidden lg:flex"
              tone="light"
              initialQuotes={quotes}
            />
          </div>
          <div className="flex items-center gap-2">
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
                    "text-ink/70 hover:bg-white hover:text-ink"
                  )}
                >
                  Sign in
                </Link>
                <Link
                  href={authHref}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-orange text-white hover:bg-orange/90"
                  )}
                >
                  Launch Terminal
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="overflow-hidden border-t border-border py-2">
          <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-label">
            {[...MARQUEE, ...MARQUEE].map((item, i) => (
              <span key={`${item}-${i}`}>{item}</span>
            ))}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:py-20">
        <div>
          <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange">
            <Cpu className="size-4" /> Cloud VPS Auto-Execution
          </p>
          <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl lg:text-7xl">
            Automated Gold Trading Engine.
          </h1>
          <p className="mt-6 text-2xl font-bold tracking-tight text-orange sm:text-3xl">
            Plug into the VPS. Pay for signals. We execute the trades.
          </p>
          <p className="mx-auto mt-6 max-w-lg text-base text-muted-label">
            XAUPower connects directly to high-speed dedicated VPS servers to execute XAU/USD setups hands-free. Simply pay a low fixed setup fee, deposit your trade balance, and withdraw your funds whenever you wish.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={authHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-orange px-6 text-white hover:bg-orange/90"
              )}
            >
              Start Automated Bot
              <ArrowRight className="size-4" />
            </Link>
            <p className="max-w-xs text-xs text-muted-label">
              Instant VPS activation · Full balance control · Withdraw anytime
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-xl">
          <LessonChart />
        </div>
      </section>

      {/* CORE HIGHLIGHTS */}
      <section className="mx-auto max-w-7xl px-4 pb-12 text-center sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Stat kicker="24/7 VPS" label="Dedicated execution host" />
          <Stat kicker="XAU/USD" label="Specialized Gold algorithm" />
          <Stat kicker="$50+" label="Fixed setup signal fee" />
          <Stat kicker="Anytime" label="Instant deposit & withdrawal" />
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-sm text-muted-label">
          Trades execute automatically across London and New York volatility windows via VPS. Trading gold carries inherent market risk. Past algorithmic performance does not guarantee future results. Manage your risk profile responsibly.
        </p>
      </section>

      {/* PLATFORM ARCHITECTURE */}
      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          System Overview
        </p>
        <h2 className="mx-auto mt-2 max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Designed for pure hands-free precision.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-label">
          Forget manual entries, missed setups, or emotional trading decisions. The bot operates continuously on dedicated cloud architecture.
        </p>
        <div className="mx-auto flex justify-center">
          <SetupCard />
        </div>
      </section>

      {/* ACTIVE TRADERS */}
      <section className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
          Connected accounts across
        </p>
        <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
          18+ countries worldwide.
        </h2>
        <CountryFlags className="mt-8 flex flex-wrap justify-center gap-2" />
      </section>

      {/* HOW IT WORKS */}
      <section id="learn" className="mx-auto max-w-7xl border-t border-border px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          Automated Workflow
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          How the bot executes
          <br />
          your trades.
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-2">
          <LearnBlock
            icon={<Zap className="size-5 text-orange" />}
            title="1. Algorithmic Signals"
            body="Our proprietary indicator monitors 50 EMA, 16-Cross MA, and institutional liquidity sweeps to isolate high-probability gold setups."
          />
          <LearnBlock
            icon={<Cpu className="size-5 text-orange" />}
            title="2. Dedicated VPS Hosting"
            body="Your bot runs on isolated VPS hardware, eliminating local latency, device dependencies, and network outages."
          />
          <LearnBlock
            icon={<Lock className="size-5 text-orange" />}
            title="3. Fixed Setup Signal Fee"
            body="Pay a flat setup fee ($50 Nominal, $100 Standard, or $200 Aggressive) to keep your bot active for the term."
          />
          <LearnBlock
            icon={<Wallet className="size-5 text-orange" />}
            title="4. Total Capital Freedom"
            body="Maintain your trade balance separately. Add funds to trade higher lot sizes or withdraw your balance whenever you choose."
          />
        </div>
      </section>

      {/* FEED & CONTROL STEPS */}
      <section id="community" className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
          Quick Onboarding
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          4 steps to start
          <br />
          auto-trading.
        </h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-4">
          <FeedStep
            n="01"
            title="Select Risk Level"
            body="Choose between Nominal, Standard, or Aggressive trading terms based on your target return profile."
          />
          <FeedStep
            n="02"
            title="Pay Setup Fee"
            body="Cover the nominal signal setup charge to provision your bot on the execution network."
          />
          <FeedStep
            n="03"
            title="Fund Your Account"
            body="Deposit your custom trading capital balance into your secure terminal environment."
          />
          <FeedStep
            n="04"
            title="Auto-Execute & Control"
            body="The VPS handles execution 24/5. Track trades live and request withdrawals at any time."
          />
        </ol>
        <div className="mt-10 flex justify-center">
          <Link
            href={authHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-orange px-5 text-white hover:bg-orange/90"
            )}
          >
            Connect Account Now
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* REVIEWS / TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          Trader Feedback
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          What users say about
          <br />
          automated execution.
        </h2>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
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

      {/* FEATURES CHECKLIST */}
      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          System Features
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          Built for reliability & control.
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Hosted VPS Execution", "Zero device overhead. Dedicated server hosts your bot."],
            ["Signal-Based Packages", "Transparent, fixed setup fees based on your selected risk term."],
            ["Zero Management Stress", "Automated entries, stop-losses, and multi-tier take-profits."],
            ["Instant Withdrawals", "Your capital is never locked. Deposit and withdraw on demand."],
            ["Strict Risk Rules", "Limits execution up to a max of 20 high-confluence trades per day."],
            ["24/5 Market Monitoring", "Constant algorithmic coverage of London and New York gold sessions."],
          ].map(([title, body]) => (
            <li key={title} className="flex flex-col items-center gap-2">
              <Check className="size-4 shrink-0 text-teal" />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-label">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* PACKAGES GRID */}
      <section id="plans" className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
          Signal Setup Terms
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Select setup term & risk profile.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-label">
          Setup fees unlock full VPS bot execution. Aggressive settings target up to {WEEKLY_PROFIT_PCT.aggressive}% per week with dynamic risk management.
        </p>
        <div className="mt-8">
          <PackagesGrid
            packages={packages}
            ctaHref={authHref}
            ctaLabel="Activate Bot"
          />
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange">
          Questions
        </p>
        <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
          Frequently asked questions.
        </h2>
        <div className="mt-10 divide-y divide-border border-y border-border text-center">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="cursor-pointer list-none text-lg font-semibold marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted-label group-open:hidden">+</span>
                  <span className="hidden text-muted-label group-open:inline">
                    −
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-label">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-label">
          Ready to Start?
        </p>
        <h2 className="mx-auto mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-6xl">
          Automate your XAU/USD
          <br />
          trading today.
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-muted-label">
          Connect your account, choose your setup term, and let the VPS execution engine handle gold market opportunities for you.
        </p>
        <Link
          href={authHref}
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-8 bg-orange px-6 text-white hover:bg-orange/90"
          )}
        >
          Launch XAUPower Bot
          <ArrowRight className="size-4" />
        </Link>
        <p className="mt-4 text-xs text-muted-label">
          Fast terminal setup · Full balance withdrawal access · Cloud VPS connected
        </p>
      </section>

      {/* FOOTER */}
      <footer id="risk" className="border-t border-border pb-28">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4 py-10 text-center sm:px-6">
          <div>
            <Wordmark href="/" className="text-ink" />
            <p className="mt-2 text-sm text-muted-label">Automated Execution Network</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-label">
            <Link href="/" className="hover:text-ink">
              Home
            </Link>
            <Link href="#learn" className="hover:text-ink">
              Architecture
            </Link>
            <Link href="#plans" className="hover:text-ink">
              Packages
            </Link>
            <Link href="#faq" className="hover:text-ink">
              FAQ
            </Link>
            <Link href="#risk" className="hover:text-ink">
              Risk Disclosure
            </Link>
            <Link href={user ? "/dashboard/settings" : "/login"} className="hover:text-ink">
              {user ? "Open profile" : "Sign in"}
            </Link>
          </nav>
        </div>
        <p className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs leading-relaxed text-muted-label sm:px-6">
          Risk Disclaimer: Trading foreign exchange and spot commodities (XAU/USD) on margin carries high risk and may not be suitable for all investors. Automated trading software is designed to execute trades based on predetermined parameters but cannot eliminate market slippage, volatility risks, or systemic black swan events. You retain full control over your balance and can request withdrawals subject to standard processor processing times. Past algorithmic returns do not guarantee future performance. © 2026 XAUPower.
        </p>
      </footer>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="flex items-center justify-center gap-2 text-xs text-muted-label sm:text-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            XAUPower VPS Bot · Hands-free execution · Withdraw anytime
          </p>
          {user ? (
            <ProfileMenu
              fullName={profile?.full_name}
              email={profile?.email ?? user.email}
              memberLabel={profile?.role === "admin" ? "Admin" : "Member"}
              tone="light"
            />
          ) : (
            <Link
              href={authHref}
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-orange text-white hover:bg-orange/90"
              )}
            >
              Launch Bot
              <ArrowRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ kicker, label }: { kicker: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl font-black tabular text-orange">{kicker}</p>
      <p className="mt-1 text-sm text-muted-label">{label}</p>
    </div>
  );
}

function LearnBlock({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md space-y-1 text-center">
      <div className="flex items-center justify-center gap-2">
        {icon}
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <p className="mx-auto text-sm leading-relaxed text-muted-label">{body}</p>
    </div>
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
    <li className="text-center">
      <p className="text-sm font-bold tabular text-orange">{n}</p>
      <h3 className="mt-2 text-lg font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-label">{body}</p>
    </li>
  );
}

function Quote({ body, who }: { body: string; who: string }) {
  return (
    <figure className="rounded-2xl border border-border bg-white p-6 text-center shadow-sm">
      <blockquote className="text-sm leading-relaxed text-ink/80">
        &ldquo;{body}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center justify-center gap-3 text-xs text-muted-label">
        <span className="flex size-8 items-center justify-center rounded-full bg-orange text-[11px] font-black text-white">
          X
        </span>
        {who}
      </figcaption>
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
    <div className="mt-8 max-w-md rounded-2xl border border-border bg-white p-5 text-left shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ink text-sm font-black text-gold">
            X
          </span>
          <div>
            <p className="text-sm font-bold">XAUPower Bot Terminal</p>
            <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> Live VPS Sync
            </p>
          </div>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold uppercase text-emerald-600">
          Auto Engine
        </span>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-label">
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
    </div>
  );
}

function LessonChart() {
  const times = ["08:00", "10:00", "12:00", "14:00", "15:45"];
  const prices = ["2,465", "2,462", "2,459", "2,456", "2,453", "2,450", "2,448"];
  return (
    <div className="rounded-2xl bg-ink p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/40">
            <span className="size-2 rounded-full bg-emerald-400" /> Live VPS Engine Feed
          </p>
          <p className="mt-1 text-3xl font-black tabular text-gold">2,462.80</p>
          <p className="mt-1 text-xs text-white/40">
            Automated Execution Target · XAU/USD
          </p>
        </div>
        <span className="rounded-full border border-teal/20 bg-teal/15 px-2.5 py-1 text-xs font-bold uppercase text-teal">
          Auto Long Triggered
        </span>
      </div>
      <div className="mt-4 flex gap-3">
        <div className="flex flex-col justify-between py-1 text-[10px] tabular text-white/30">
          {prices.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
        <svg viewBox="0 0 360 220" className="h-52 w-full" aria-hidden>
          <defs>
            <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[40, 80, 120, 160, 200].map((y) => (
            <line
              key={y}
              x1="0"
              x2="360"
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}
          <path
            d="M0 150 C 40 140, 70 90, 110 70 C 150 50, 180 95, 210 110 C 250 128, 290 60, 360 48 L 360 220 L 0 220 Z"
            fill="url(#goldFill)"
          />
          <path
            d="M0 150 C 40 140, 70 90, 110 70 C 150 50, 180 95, 210 110 C 250 128, 290 60, 360 48"
            fill="none"
            stroke="hsl(var(--gold))"
            strokeWidth="2.5"
          />
          <circle cx="290" cy="62" r="5" fill="hsl(var(--gold))" />
          <line
            x1="290"
            x2="290"
            y1="62"
            y2="175"
            stroke="hsl(var(--gold))"
            strokeDasharray="3 4"
            opacity="0.7"
          />
        </svg>
      </div>
      <div className="mt-2 flex justify-between pl-10 text-[10px] tabular text-white/30">
        {times.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-xs">
        <span className="text-white/50">Auto-Execution Latency: 0.4ms</span>
        <span className="font-extrabold tabular text-gold">2,462.80</span>
      </div>
    </div>
  );
}

