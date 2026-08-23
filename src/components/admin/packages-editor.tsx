"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatUsd, RISK_LABEL } from "@/lib/format";
import type { Package, PackageVariant, RoadmapStep } from "@/lib/types";

type Row = PackageVariant & { packages?: Package; activeCount: number };

export function PackagesEditor({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<Row | null>(null);

  const grouped = useMemo(() => {
    const names = ["Assay", "Bullion", "Vault"] as const;
    return names.map((name) => ({
      name,
      rows: rows.filter((r) => r.packages?.name === name),
    }));
  }, [rows]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-kicker">Admin</p>
        <h1 className="text-display mt-1 text-3xl sm:text-4xl">Packages</h1>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-card shadow-card">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-canvas text-xs uppercase text-ink/50">
            <tr>
              <th className="px-3 py-2">Package</th>
              <th className="px-3 py-2">Risk</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Max lots</th>
              <th className="px-3 py-2">Bot profit target</th>
              <th className="px-3 py-2">Max drawdown</th>
              <th className="px-3 py-2">Active customers</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {grouped.flatMap((g) =>
              g.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{g.name}</td>
                  <td className="px-3 py-2">{RISK_LABEL[row.risk_tier]}</td>
                  <td className="px-3 py-2 tabular">
                    {formatUsd(row.price_usd)}
                  </td>
                  <td className="px-3 py-2 tabular">{row.max_lot_size}</td>
                  <td className="px-3 py-2 tabular">
                    {row.profit_target_pct}%
                  </td>
                  <td className="px-3 py-2 tabular">
                    {row.max_drawdown_pct}%
                  </td>
                  <td className="px-3 py-2 tabular text-ink/70">
                    {row.activeCount}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-border text-ink hover:bg-orange/10"
                      onClick={() => setEditing(row)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <VariantEditorSheet
        row={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          setRows((cur) =>
            cur.map((r) =>
              r.id === updated.id ? { ...updated, activeCount: r.activeCount } : r
            )
          );
          setEditing(null);
        }}
      />
    </section>
  );
}

function VariantEditorSheet({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: (row: Row) => void;
}) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto border-border bg-white text-ink sm:max-w-md"
      >
        {row && (
          <EditorForm key={row.id} row={row} onSaved={onSaved} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditorForm({
  row,
  onSaved,
}: {
  row: Row;
  onSaved: (row: Row) => void;
}) {
  const [price, setPrice] = useState(String(row.price_usd));
  const [lots, setLots] = useState(String(row.max_lot_size));
  const [target, setTarget] = useState(String(row.profit_target_pct));
  const [drawdown, setDrawdown] = useState(String(row.max_drawdown_pct));
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>(row.roadmap ?? []);
  const [saving, setSaving] = useState(false);

  function move(index: number, dir: -1 | 1) {
    const next = [...roadmap];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setRoadmap(next.map((s, i) => ({ ...s, step: i + 1 })));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/package-variants", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          price_usd: Number(price),
          max_lot_size: Number(lots),
          profit_target_pct: Number(target),
          max_drawdown_pct: Number(drawdown),
          roadmap,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not save");
        return;
      }
      toast.message("Package variant updated");
      onSaved({
        ...(data.variant as PackageVariant),
        activeCount: row.activeCount,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="text-ink">
          {row.packages?.name} · {RISK_LABEL[row.risk_tier]}
        </SheetTitle>
        <SheetDescription className="text-ink/50">
          {row.activeCount} active customer
          {row.activeCount === 1 ? "" : "s"} on this variant — they keep their
          snapshotted terms.
        </SheetDescription>
      </SheetHeader>

      <form
        className="space-y-4 px-4 pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Price (USD)">
          <Input
            type="number"
            min={1}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="border-border bg-canvas text-ink"
          />
        </Field>
        <Field label="Max lot size">
          <Input
            type="number"
            min={0.01}
            step="0.01"
            value={lots}
            onChange={(e) => setLots(e.target.value)}
            className="border-border bg-canvas text-ink"
          />
        </Field>
        <Field label="Bot profit target (%)">
          <Input
            type="number"
            step="0.1"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="border-border bg-canvas text-ink"
          />
        </Field>
        <Field label="Max drawdown band (%)">
          <Input
            type="number"
            step="0.1"
            value={drawdown}
            onChange={(e) => setDrawdown(e.target.value)}
            className="border-border bg-canvas text-ink"
          />
        </Field>

        <div className="space-y-2">
          <Label className="text-ink/70">Roadmap</Label>
          <p className="text-xs text-ink/40">
            Steps describe XAUUSD (gold) bot behaviour only. Do not mention other
            pairs.
          </p>
          <ul className="space-y-2">
            {roadmap.map((step, i) => (
              <li key={`${step.step}-${i}`} className="flex gap-2">
                <Input
                  value={step.label}
                  onChange={(e) => {
                    const next = [...roadmap];
                    next[i] = { ...next[i], label: e.target.value };
                    setRoadmap(next);
                  }}
                  placeholder="XAUUSD gold bot step"
                  className="border-border bg-canvas text-ink"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-ink/60 hover:text-ink"
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-ink/60 hover:text-ink"
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-hotpink hover:text-hotpink"
                  onClick={() =>
                    setRoadmap(roadmap.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="border-border text-ink hover:bg-orange/10"
            onClick={() =>
              setRoadmap([
                ...roadmap,
                { step: roadmap.length + 1, label: "" },
              ])
            }
          >
            <Plus className="mr-1 size-4" />
            Add step
          </Button>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full bg-orange text-white hover:bg-orange/90"
        >
          {saving ? "Saving…" : "Save variant"}
        </Button>
      </form>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-ink/70">{label}</Label>
      {children}
    </div>
  );
}
