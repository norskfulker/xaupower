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
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-lg px-4 pt-3 pb-3 sm:max-w-3xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-3">
          <Link
            href={authHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 w-full bg-orange text-white hover:bg-orange/90 sm:h-10 sm:w-auto sm:min-w-[11rem]"
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
              "h-12 w-full border-border bg-white sm:h-10 sm:w-auto sm:min-w-[10rem]"
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
