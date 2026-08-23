import { Boxes, Bot, Banknote } from "lucide-react";
import { SurfaceCard } from "@/components/ui/surface-card";

const STEPS = [
  {
    n: "01",
    title: "Buy a Bot Plan",
    body: "Choose a risk term and unlock VPS bot access for your account.",
    icon: Boxes,
  },
  {
    n: "02",
    title: "Bot executes trades",
    body: "The bot trades with your profit target in mind — or follow our signals.",
    icon: Bot,
  },
  {
    n: "03",
    title: "Withdraw your profit",
    body: "Once a trade is closed, withdraw available profit from Cashier.",
    icon: Banknote,
  },
] as const;

export function DashboardHowItWorks() {
  return (
    <SurfaceCard>
      <p className="text-kicker">How it works</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {STEPS.map(({ n, title, body, icon: Icon }) => (
          <div
            key={n}
            className="flex min-h-[9.5rem] flex-col rounded-2xl bg-canvas p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-kicker text-orange">{n}</span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-orange/10 text-orange">
                <Icon className="size-4" />
              </span>
            </div>
            <h3 className="mt-3 text-base font-bold leading-snug text-ink">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-label">{body}</p>
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}
