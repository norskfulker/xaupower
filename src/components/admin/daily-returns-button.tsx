"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DailyReturnsButton() {
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<{ credited: number; at: string } | null>(
    null
  );

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-daily-returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not credit daily returns");
        return;
      }
      const credited = Number(data.credited ?? 0);
      setLast({ credited, at: new Date().toISOString() });
      toast.message(
        credited > 0
          ? `Credited ${credited} account${credited === 1 ? "" : "s"}.`
          : "No new credits (already credited today)."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-card p-6 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Run daily credit</p>
          <p className="mt-1 text-xs text-muted-label">
            Triggered by the external cron in production.
          </p>
        </div>
        <Button
          onClick={() => void run()}
          disabled={loading}
          className="gap-2 bg-orange text-white hover:bg-orange/90"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {loading ? "Crediting…" : "Credit daily returns"}
        </Button>
      </div>
      {last && (
        <p className="mt-4 text-xs text-muted-label">
          Last run: {new Date(last.at).toLocaleString()} · credited{" "}
          <span className="font-bold tabular text-ink">{last.credited}</span>{" "}
          account{last.credited === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}