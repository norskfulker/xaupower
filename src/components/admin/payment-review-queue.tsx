"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import { explorerTxUrl } from "@/lib/explorer";
import type { Payment } from "@/lib/types";

export function PaymentReviewQueue({
  initialQueue,
}: {
  initialQueue: Payment[];
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function approve(id: string) {
    setLoading(id);
    try {
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not approve");
        return;
      }
      toast.message("Payment approved");
      setQueue((q) => q.filter((p) => p.id !== id));
    } finally {
      setLoading(null);
    }
  }

  async function reject(id: string) {
    if (!note.trim()) {
      toast.error("Admin note is required");
      return;
    }
    setLoading(id);
    try {
      const res = await fetch("/api/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: id, adminNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not reject");
        return;
      }
      toast.message("Payment rejected");
      setQueue((q) => q.filter((p) => p.id !== id));
      setRejectId(null);
      setNote("");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="payments" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Deposit review queue</h2>
          <p className="text-sm text-white/60">
            Confirm on-chain transfers before activating packages.
          </p>
        </div>
        <span className="rounded-full bg-orange/20 px-3 py-1 text-xs font-semibold text-orange">
          {queue.length} pending
        </span>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          No deposits waiting for review.
        </div>
      ) : (
        <ul className="space-y-3">
          {queue.map((p) => {
            const variant = p.package_variants;
            const pkgName = variant?.packages?.name ?? "Package";
            const explorer = p.tx_hash
              ? explorerTxUrl(p.currency, p.tx_hash)
              : null;
            return (
              <li
                key={p.id}
                className="rounded-2xl border border-orange/30 bg-white/5 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold tabular text-gold">
                      {formatUsd(p.amount_usd)} · {p.currency}
                    </p>
                    <p className="mt-1 text-sm text-white/70">
                      {pkgName} · {variant?.risk_tier ?? "—"}
                    </p>
                    <p className="mt-1 text-sm text-white/50">
                      {(p.profiles as { email?: string } | null)?.email ??
                        p.user_id.slice(0, 8)}
                    </p>
                    {p.tx_hash && (
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <code className="break-all tabular text-white/70">
                          {p.tx_hash}
                        </code>
                        <button
                          type="button"
                          className="text-white/50 hover:text-white"
                          onClick={() => {
                            void navigator.clipboard.writeText(p.tx_hash!);
                            toast.message("Tx hash copied");
                          }}
                        >
                          <Copy className="size-3.5" />
                        </button>
                        {explorer && (
                          <a
                            href={explorer}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange hover:underline"
                          >
                            Explorer
                          </a>
                        )}
                      </div>
                    )}
                    {p.user_note && (
                      <p className="mt-2 text-xs text-white/40">
                        Note: {p.user_note}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-white/40">
                      Submitted{" "}
                      {p.submitted_at
                        ? new Date(p.submitted_at).toLocaleString()
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="bg-teal text-ink hover:bg-teal/90"
                      disabled={loading === p.id}
                      onClick={() => approve(p.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="border-hotpink/40 text-hotpink"
                      disabled={loading === p.id}
                      onClick={() => setRejectId(p.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>

                {rejectId === p.id && (
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                    <Label className="text-white/80">Admin note (required)</Label>
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="bg-ink text-white"
                      placeholder="e.g. Tx hash not found on-chain"
                    />
                    <Button
                      className="bg-hotpink text-white hover:bg-hotpink/90"
                      onClick={() => reject(p.id)}
                    >
                      Confirm reject
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
