"use client";

import { formatUsd } from "@/lib/format";
import { useMemo } from "react";

const INITIALS = [
  "A.P.",
  "M.K.",
  "R.S.",
  "J.L.",
  "N.V.",
  "D.H.",
  "S.T.",
  "C.W.",
  "E.B.",
  "L.G.",
  "P.M.",
  "Y.C.",
];

function randomItems(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const name = INITIALS[i % INITIALS.length];
    const amount = 180 + ((i * 137) % 4200) + (i % 3) * 25;
    return `${name}  +${formatUsd(amount)}`;
  });
}

export function ProfitsTicker() {
  const items = useMemo(() => randomItems(12), []);
  const loop = [...items, ...items];

  return (
    <div className="flex items-stretch overflow-hidden border-b border-border bg-white">
      <div className="flex shrink-0 items-center border-r border-border bg-white px-3 py-2 sm:px-4">
        <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
          XAUUSD feed
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden py-2">
        <div className="marquee-track flex w-max gap-10 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-label">
          {loop.map((item, i) => (
            <span key={`${item}-${i}`} className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-teal" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
