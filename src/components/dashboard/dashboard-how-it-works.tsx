"use client";

import { useState } from "react";
import { ChevronDown, Boxes, Bot, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    id: "buy",
    title: "Create an account",
    body: "Pick a risk tier. Deposit any amount.",
    icon: Boxes,
  },
  {
    id: "execute",
    title: "Bot trades",
    body: "Each account runs independently.",
    icon: Bot,
  },
  {
    id: "funds",
    title: "Deposit, withdraw, transfer",
    body: "Move funds any time.",
    icon: Banknote,
  },
] as const;

export function DashboardHowItWorks() {
  const [openId, setOpenId] = useState<string | null>(STEPS[0].id);

  return (
    <section
      aria-label="How it works"
      className="rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="p-6 sm:p-7">
        <h2 className="font-display text-2xl tracking-tight text-ink sm:text-3xl">
          How it works
        </h2>
        <p className="mt-1.5 text-sm text-muted-label">
          Three steps from purchase to payout.
        </p>
      </div>
      <div className="border-t border-border">
        {STEPS.map(({ id, title, body, icon: Icon }, i) => {
          const open = openId === id;
          return (
            <div
              key={id}
              className={cn(
                "border-border",
                i > 0 && "border-t"
              )}
            >
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`step-${id}`}
                onClick={() => setOpenId(open ? null : id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition",
                  "hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  open && "bg-canvas"
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-xl",
                      open
                        ? "bg-orange text-white"
                        : "bg-orange/10 text-orange"
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="font-display text-base text-ink sm:text-lg">
                    {title}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-muted-label transition-transform",
                    open && "rotate-180"
                  )}
                />
              </button>
              {open && (
                <div
                  id={`step-${id}`}
                  className="bg-canvas px-5 pb-5 pt-1 text-sm leading-relaxed text-muted-label"
                >
                  {body}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
