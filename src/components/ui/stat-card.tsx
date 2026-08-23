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
        "relative flex h-full min-h-[11rem] flex-col rounded-2xl bg-card p-6 shadow-card sm:min-h-[12.5rem] sm:p-7",
        className
      )}
    >
      {Icon && (
        <span className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-xl bg-orange/10 text-orange">
          <Icon className="size-4" />
        </span>
      )}
      <p className="text-kicker">{label}</p>
      <p
        className={cn(
          "text-metric mt-4 break-words text-orange",
          Icon && "pr-10",
          valueClassName
        )}
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
