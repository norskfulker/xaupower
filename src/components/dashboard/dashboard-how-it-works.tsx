import { Boxes, Bot, Banknote, ArrowRight } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";

const STEPS = [
  {
    n: "01",
    title: "Buy a bot plan",
    body: "Each purchase creates its own bot ID. You can run more than one bot at a time.",
    icon: Boxes,
  },
  {
    n: "02",
    title: "Bot executes trades",
    body: "Each bot runs on its own plan. Other bots stay separate.",
    icon: Bot,
  },
  {
    n: "03",
    title: "Add funds or cash out",
    body: "Use Add funds or Cashout on the bot card so money goes to the correct bot ID.",
    icon: Banknote,
  },
] as const;

export function DashboardHowItWorks() {
  return (
    <SurfaceCard>
      <p className="text-kicker">How it works</p>
      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        {STEPS.map(({ n, title, body, icon: Icon }, i) => (
          <div key={n} className="flex flex-1 flex-col items-stretch sm:flex-row sm:items-center">
            <div className="flex min-h-[9.5rem] flex-1 flex-col rounded-2xl bg-canvas p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-kicker text-orange">{n}</span>
                <span className="flex size-8 items-center justify-center rounded-xl bg-orange/10 text-orange">
                  <Icon className="size-4" />
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold leading-snug text-ink">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-label">
                {body}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex shrink-0 items-center justify-center py-1 text-orange sm:px-2 sm:py-0"
                aria-hidden
              >
                <ArrowRight className="size-5 rotate-90 sm:rotate-0" />
              </div>
            )}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
