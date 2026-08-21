"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Grain, RangeKey } from "@/lib/analytics";

const RANGES: { id: RangeKey; label: string }[] = [
  { id: "7", label: "7d" },
  { id: "30", label: "30d" },
  { id: "90", label: "90d" },
  { id: "custom", label: "Custom" },
];

const GRAINS: { id: Grain; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export function AnalyticsFilters({
  range,
  grain,
  from,
  to,
}: {
  range: RangeKey;
  grain: Grain;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function push(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) sp.set(k, v);
    router.push(`/admin/analytics?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex rounded-full border border-border p-1">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => push({ range: r.id })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              range === r.id
                ? "bg-orange text-white"
                : "text-ink/60 hover:text-ink"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex rounded-full border border-border p-1">
        {GRAINS.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => push({ grain: g.id })}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold",
              grain === g.id
                ? "bg-canvas text-ink"
                : "text-ink/60 hover:text-ink"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex gap-2">
          <input
            type="date"
            defaultValue={from}
            className="rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink"
            onChange={(e) => push({ range: "custom", from: e.target.value })}
          />
          <input
            type="date"
            defaultValue={to}
            className="rounded-lg border border-border bg-canvas px-2 py-1 text-sm text-ink"
            onChange={(e) => push({ range: "custom", to: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
