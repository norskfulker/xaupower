"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPrice, formatUsd } from "@/lib/format";
import type { Signal, SignalDirection, SignalPair } from "@/lib/types";

export function SignalManager({
  initialSignals,
}: {
  initialSignals: Signal[];
}) {
  const [signals, setSignals] = useState(initialSignals);
  const [pair, setPair] = useState<SignalPair>("XAUUSD");
  const [direction, setDirection] = useState<SignalDirection>("long");
  const [entry, setEntry] = useState("");
  const [sl, setSl] = useState("");
  const [tp, setTp] = useState("");
  const [exitMap, setExitMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function postSignal() {
    setLoading(true);
    try {
      const res = await fetch("/api/signals/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair,
          direction,
          entryPrice: Number(entry),
          stopLoss: Number(sl),
          takeProfit: Number(tp),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not post signal");
        return;
      }
      setSignals((prev) => [data.signal as Signal, ...prev]);
      setEntry("");
      setSl("");
      setTp("");
      toast.success("Signal posted");
    } finally {
      setLoading(false);
    }
  }

  async function closeSignal(id: string) {
    const exitPrice = Number(exitMap[id]);
    if (!Number.isFinite(exitPrice)) {
      toast.error("Enter an exit price");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/signals/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId: id, exitPrice }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not close signal");
        return;
      }
      setSignals((prev) =>
        prev.map((s) => (s.id === id ? (data.signal as Signal) : s))
      );
      toast.message("Signal closed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="signals" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Signal management</h2>
        <p className="text-sm text-white/60">
          Posting pushes to all user dashboards via Realtime.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-5">
        <div className="space-y-2">
          <Label className="text-white/70">Pair</Label>
          <Select
            value={pair}
            onValueChange={(v) => v && setPair(v as SignalPair)}
          >
            <SelectTrigger className="w-full border-white/20 bg-ink text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="XAUUSD">XAUUSD</SelectItem>
              <SelectItem value="XAGUSD">XAGUSD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Direction</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              className={
                direction === "long"
                  ? "bg-teal text-ink"
                  : "bg-white/10 text-white"
              }
              onClick={() => setDirection("long")}
            >
              Long
            </Button>
            <Button
              type="button"
              className={
                direction === "short"
                  ? "bg-hotpink text-white"
                  : "bg-white/10 text-white"
              }
              onClick={() => setDirection("short")}
            >
              Short
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Entry</Label>
          <Input
            className="border-white/20 bg-ink text-white tabular"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Stop loss</Label>
          <Input
            className="border-white/20 bg-ink text-white tabular"
            value={sl}
            onChange={(e) => setSl(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-white/70">Take profit</Label>
          <Input
            className="border-white/20 bg-ink text-white tabular"
            value={tp}
            onChange={(e) => setTp(e.target.value)}
          />
        </div>
        <div className="md:col-span-5">
          <Button
            className="bg-orange text-white hover:bg-orange/90"
            disabled={loading}
            onClick={postSignal}
          >
            Post signal
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-white/50">
            <tr>
              <th className="px-3 py-2">Pair</th>
              <th className="px-3 py-2">Dir</th>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">P&amp;L</th>
              <th className="px-3 py-2">Close</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.id} className="border-t border-white/10">
                <td className="px-3 py-2">{s.pair}</td>
                <td className="px-3 py-2 capitalize">{s.direction}</td>
                <td className="px-3 py-2 tabular">
                  {formatPrice(s.entry_price)}
                </td>
                <td className="px-3 py-2 capitalize">{s.status}</td>
                <td className="px-3 py-2 tabular">
                  {s.pnl_usd != null ? formatUsd(s.pnl_usd) : "—"}
                </td>
                <td className="px-3 py-2">
                  {s.status === "open" ? (
                    <div className="flex gap-2">
                      <Input
                        className="h-8 w-28 border-white/20 bg-ink text-white tabular"
                        placeholder="Exit"
                        value={exitMap[s.id] ?? ""}
                        onChange={(e) =>
                          setExitMap((m) => ({ ...m, [s.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        className="bg-white/10"
                        disabled={loading}
                        onClick={() => closeSignal(s.id)}
                      >
                        Close
                      </Button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
