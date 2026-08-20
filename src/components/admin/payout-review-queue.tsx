"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUsd } from "@/lib/format";
import type { Payout } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PayoutReviewQueue({
  initialQueue,
  initialReviewed,
}: {
  initialQueue: Payout[];
  initialReviewed: Payout[];
}) {
  const [queue, setQueue] = useState(initialQueue);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [showReviewed, setShowReviewed] = useState(false);

  const sortedQueue = useMemo(
    () =>
      [...queue].sort(
        (a, b) =>
          new Date(a.requested_at).getTime() -
          new Date(b.requested_at).getTime()
      ),
    [queue]
  );

  async function approve(id: string) {
    setLoading(id);
    try {
      const res = await fetch("/api/payouts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not approve");
        return;
      }
      toast.message("Payout approved");
      const updated = data.payout as Payout;
      setQueue((q) => q.filter((p) => p.id !== id));
      setReviewed((r) => [updated, ...r]);
      if (data.requiresVerification) {
        setVerifyId(id);
      }
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
      const res = await fetch("/api/payouts/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId: id, adminNote: note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not reject");
        return;
      }
      toast.message("Payout rejected");
      const item = queue.find((p) => p.id === id);
      setQueue((q) => q.filter((p) => p.id !== id));
      if (item) {
        setReviewed((r) => [
          { ...item, status: "rejected", admin_note: note },
          ...r,
        ]);
      }
      setRejectId(null);
      setNote("");
    } finally {
      setLoading(null);
    }
  }

  async function verify() {
    if (!verifyId || !code.trim()) return;
    setLoading(verifyId);
    try {
      const res = await fetch("/api/payouts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutId: verifyId,
          verificationCode: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Verification failed");
        return;
      }
      toast.success("Payout verified with provider");
      setVerifyId(null);
      setCode("");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section id="payouts" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Payout review queue</h2>
          <p className="text-sm text-white/60">
            Approve sends to NOWPayments after review. Reject restores balance.
          </p>
        </div>
        <span className="rounded-full bg-orange/20 px-3 py-1 text-xs font-semibold text-orange">
          {sortedQueue.length} pending
        </span>
      </div>

      {sortedQueue.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Queue is clear. New withdrawal requests will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedQueue.map((p) => (
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
                    {(p.profiles as { email?: string } | null)?.email ??
                      p.user_id.slice(0, 8)}
                  </p>
                  <p className="mt-1 break-all text-xs tabular text-white/50">
                    {p.destination_address}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    Requested {new Date(p.requested_at).toLocaleString()}
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
                    placeholder="Why this payout is rejected"
                  />
                  <Button
                    className="bg-hotpink text-white hover:bg-hotpink/90"
                    onClick={() => reject(p.id)}
                  >
                    Confirm reject
                  </Button>
                </div>
              )}

              {verifyId === p.id && (
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  <Label className="text-white/80">
                    NOWPayments 2FA verification code
                  </Label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-ink text-white"
                  />
                  <Button
                    className="bg-orange text-white hover:bg-orange/90"
                    onClick={verify}
                  >
                    Verify payout
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="text-sm text-white/50 hover:text-white/80"
        onClick={() => setShowReviewed((v) => !v)}
      >
        {showReviewed ? "Hide" : "Show"} reviewed payouts ({reviewed.length})
      </button>

      {showReviewed && (
        <ul className="space-y-2 opacity-60">
          {reviewed.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
              )}
            >
              <span className="tabular font-medium">
                {formatUsd(p.amount_usd)} {p.currency}
              </span>
              <span className="ml-3 capitalize text-white/50">
                {p.status.replace("_", " ")}
              </span>
              {p.admin_note && (
                <p className="mt-1 text-xs text-white/40">{p.admin_note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
