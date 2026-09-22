import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "card-hover relative flex h-full min-h-[11rem] flex-col rounded-2xl bg-card p-6 sm:min-h-[12.5rem] sm:p-7",
        className
      )}
    >
      {Icon && (
        <span className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-4" />
        </span>
      )}
      <p className="text-sm font-semibold text-ink">{label}</p>
      <p
        className={cn(
          "font-display mt-4 break-words text-4xl leading-none tracking-tight text-orange sm:text-5xl",
          Icon && "pr-10",
          valueClassName
        )}
        style={{
          fontFamily:
            "var(--font-feature-display), FeatureDisplayNumerals, var(--font-inter), sans-serif",
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-auto pt-3 text-xs leading-snug text-muted-label">
          {hint}
        </p>
      ) : (
        <div className="mt-auto pt-3" aria-hidden />
      )}
    </div>
  );
}
