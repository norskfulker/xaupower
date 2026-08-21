import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white p-5 shadow-sm",
        className
      )}
    >
      {Icon && (
        <span className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-lg bg-orange/10 text-orange">
          <Icon className="size-4" />
        </span>
      )}
      <p className="text-xs uppercase tracking-wide text-muted-label">{label}</p>
      <p className="mt-3 pr-12 text-3xl font-extrabold tabular text-orange">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-muted-label">{hint}</p>}
    </div>
  );
}
