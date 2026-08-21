import { cn } from "@/lib/utils";

export function CrownMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--orange))" />
      <path
        d="M7 22h18l-1.2-9.5-4.8 3.2L16 8l-3 7.7-4.8-3.2L7 22Z"
        fill="hsl(var(--ink))"
      />
      <path d="M8 23.5h16v1.8H8z" fill="hsl(var(--ink))" />
    </svg>
  );
}
