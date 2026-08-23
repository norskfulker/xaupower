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
          ? "flex h-full min-h-[10.5rem] flex-col rounded-2xl bg-orange/10 p-6 shadow-card ring-1 ring-orange/30 sm:min-h-[11.5rem] sm:p-7"
          : "flex h-full min-h-[10.5rem] flex-col rounded-2xl bg-card p-6 shadow-card sm:min-h-[11.5rem] sm:p-7"
      }
    >
      <p className="text-kicker">{label}</p>
      <p className="text-metric mt-4 break-words text-ink">{value}</p>
    </div>
  );
}
