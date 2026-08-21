import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";

export default function PineScriptPage() {
  return (
    <div className="mx-auto max-w-xl rounded-lg bg-white shadow-sm p-8 text-center">
      <p className="text-xs uppercase tracking-wide text-orange">Later track</p>
      <h1 className="mt-2 text-2xl font-bold text-ink">Pine Script</h1>
      <p className="mt-3 text-sm text-muted-label">
        TradingView pine-script access is coming soon. This is a placeholder so
        the nav stays complete — it is not part of the current VPS-bot deposit
        and payout flow.
      </p>
      <Link
        href="/dashboard"
        prefetch={false}
        className={buttonVariants({
          className: "mt-6 bg-orange text-white hover:bg-orange/90",
        })}
      >
        Back to dashboard
      </Link>
    </div>
  );
}
