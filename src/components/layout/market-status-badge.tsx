"use client";

import { getMarketStatus } from "@/lib/market-hours";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function MarketStatusBadge({ className }: { className?: string }) {
  const [status, setStatus] = useState(() => getMarketStatus());

  useEffect(() => {
    setStatus(getMarketStatus());
    const id = window.setInterval(() => setStatus(getMarketStatus()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span
      title={status.detail}
      className={cn(
        "inline-flex max-w-[9.5rem] items-center gap-1.5 truncate rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
        status.open
          ? "bg-teal/15 text-teal"
          : "bg-muted-label/10 text-muted-label",
        className
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status.open ? "bg-teal" : "bg-muted-label"
        )}
      />
      <span className="truncate">{status.label}</span>
    </span>
  );
}
