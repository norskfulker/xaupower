import { cn } from "@/lib/utils";

/** Equal padding on all sides by default — use across landing and app surfaces. */
export function SurfaceCard({
  className,
  padding = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  padding?: "none" | "sm" | "default" | "lg";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card text-ink shadow-card",
        padding === "sm" && "p-5",
        padding === "default" && "p-6",
        padding === "lg" && "p-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
