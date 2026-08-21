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
    <Link href={href} className={cn("text-xl font-black tracking-tight text-ink", className)}>
      XAU<span className="text-orange">Power</span>
    </Link>
  );
}
