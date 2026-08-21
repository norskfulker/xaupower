import { cn } from "@/lib/utils";

export function StatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const key = status.toLowerCase().replace(/_/g, " ");
  const tone =
    key.includes("confirm") ||
    key.includes("active") ||
    key.includes("sent") ||
    key.includes("complete")
      ? "bg-teal/20 text-teal"
      : key.includes("reject") ||
          key.includes("fail") ||
          key.includes("expir") ||
          key.includes("cancel")
        ? "bg-hotpink/20 text-hotpink"
        : "bg-orange/15 text-orange";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize",
        tone,
        className
      )}
    >
      {key}
    </span>
  );
}
