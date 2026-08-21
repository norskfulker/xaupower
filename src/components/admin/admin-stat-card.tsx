export function AdminStatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border-2 border-orange bg-orange/10 p-5"
          : "rounded-lg bg-white p-5 shadow-sm"
      }
    >
      <p className="text-xs uppercase tracking-wide text-muted-label">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tabular text-ink">{value}</p>
    </div>
  );
}
