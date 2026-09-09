import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  href = "/dashboard",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display text-xl tracking-tight text-ink sm:text-2xl",
        className
      )}
    >
      XAU<span className="text-orange">Power</span>
    </Link>
  );
}
