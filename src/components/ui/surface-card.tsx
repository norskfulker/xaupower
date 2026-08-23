import { cn } from "@/lib/utils";

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
        padding === "sm" && "p-4 sm:p-5",
        padding === "default" && "p-6 sm:p-7",
        padding === "lg" && "p-7 sm:p-9",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
