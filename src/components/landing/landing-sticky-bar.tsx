import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bot, MessageCircle } from "lucide-react";

export function LandingStickyBar({
  authHref,
  telegramUrl,
}: {
  authHref: string;
  telegramUrl: string;
}) {
  return (
    <div
      className="fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-6 md:bottom-6 md:left-auto"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="surface-float mx-auto max-w-lg px-3 py-3 md:max-w-none">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Link
            href={authHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 w-full bg-orange text-white hover:bg-orange/90 sm:h-11 md:w-auto md:min-w-[11rem]"
            )}
          >
            <Bot className="size-4 shrink-0" />
            Start Automated Bot
          </Link>
          <Link
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 w-full bg-white/80 sm:h-11 md:w-auto md:min-w-[10rem]"
            )}
          >
            <MessageCircle className="size-4 shrink-0" />
            Join Telegram
          </Link>
        </div>
      </div>
    </div>
  );
}
