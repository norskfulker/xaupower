import { cn } from "@/lib/utils";

export function GoldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4 shrink-0", className)}
      aria-label="Gold"
      role="img"
    >
      <rect
        x="4"
        y="10"
        width="16"
        height="8"
        rx="1.5"
        fill="hsl(var(--gold))"
      />
      <rect
        x="5.5"
        y="7"
        width="13"
        height="4"
        rx="1"
        fill="hsl(var(--gold))"
        opacity="0.85"
      />
      <rect
        x="7"
        y="5"
        width="10"
        height="3"
        rx="0.75"
        fill="hsl(var(--gold))"
        opacity="0.7"
      />
      <path
        d="M6 18.5h12"
        stroke="hsl(var(--ink))"
        strokeWidth="0.5"
        opacity="0.25"
      />
    </svg>
  );
}
