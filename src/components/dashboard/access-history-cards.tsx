"use client";

import { StatusPill } from "@/components/ui/status-pill";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RISK_LABEL } from "@/lib/format";
import {
  packageDisplayLabel,
  resolveUserPackageTerms,
} from "@/lib/package-terms";
import type { UserPackage } from "@/lib/types";
import { format } from "date-fns";
import { useState } from "react";

type HistoryRow = Pick<
  UserPackage,
  | "id"
  | "status"
  | "purchased_at"
  | "expires_at"
  | "variant_snapshot"
  | "package_variants"
>;

export function AccessHistoryCards({ rows }: { rows: HistoryRow[] }) {
  const [selected, setSelected] = useState<HistoryRow | null>(null);
  const terms = selected ? resolveUserPackageTerms(selected) : null;

  return (
    <>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-muted-label">
          Access history
        </p>
        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-muted-label">No bot access yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {rows.map((row) => {
              const rowTerms = resolveUserPackageTerms(row);
              const label = packageDisplayLabel(rowTerms) ?? "Bot";
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-canvas px-3.5 py-3 text-left transition hover:border-orange/40 hover:bg-orange/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {label}
                      </span>
                      <span className="mt-0.5 block text-xs tabular text-muted-label">
                        {row.purchased_at
                          ? format(new Date(row.purchased_at), "d MMM yyyy")
                          : "—"}
                        {" → "}
                        {row.expires_at
                          ? format(new Date(row.expires_at), "d MMM yyyy")
                          : "—"}
                      </span>
                    </span>
                    <StatusPill status={row.status} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md border-border bg-white p-6 text-ink sm:max-w-md sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-ink">
              {packageDisplayLabel(terms) ?? "Bot access"}
            </DialogTitle>
            <DialogDescription className="text-muted-label">
              Access period details
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="mt-2 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">Status</dt>
                <dd>
                  <StatusPill status={selected.status} />
                </dd>
              </div>
              {terms && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-label">Risk tier</dt>
                  <dd className="font-semibold text-ink">
                    {RISK_LABEL[terms.risk_tier]}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">Start</dt>
                <dd className="tabular font-semibold text-ink">
                  {selected.purchased_at
                    ? format(new Date(selected.purchased_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-label">End</dt>
                <dd className="tabular font-semibold text-ink">
                  {selected.expires_at
                    ? format(new Date(selected.expires_at), "d MMM yyyy")
                    : "—"}
                </dd>
              </div>
              {terms && (
                <>
                  <div className="flex justify-between gap-4 border-t border-border pt-3">
                    <dt className="text-muted-label">Bot lot</dt>
                    <dd className="tabular font-semibold text-ink">
                      {terms.max_lot_size}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-label">Profit target</dt>
                    <dd className="tabular font-semibold text-ink">
                      {terms.profit_target_pct}%
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-label">Max drawdown</dt>
                    <dd className="tabular font-semibold text-ink">
                      {terms.max_drawdown_pct}%
                    </dd>
                  </div>
                </>
              )}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
