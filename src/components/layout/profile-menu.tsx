"use client";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { History, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

export function ProfileMenu({
  fullName,
  email,
  memberLabel,
  tone = "light",
  align = "end",
}: {
  fullName?: string | null;
  email?: string | null;
  memberLabel?: string;
  tone?: "light" | "dark";
  align?: "start" | "end";
}) {
  const router = useRouter();
  const name = fullName?.trim() || email || "Member";
  const initial = name.charAt(0).toUpperCase();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-3 rounded-lg px-1.5 py-1 text-left outline-none transition",
          tone === "dark"
            ? "hover:bg-white/10"
            : "hover:bg-ink/5"
        )}
      >
        <span className="hidden text-right sm:block">
          <span
            className={cn(
              "block text-sm font-semibold leading-tight",
              tone === "dark" ? "text-white" : "text-ink"
            )}
          >
            {name}
          </span>
          {memberLabel && (
            <span
              className={cn(
                "block text-xs",
                tone === "dark" ? "text-orange" : "text-orange"
              )}
            >
              {memberLabel}
            </span>
          )}
        </span>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            tone === "dark" ? "bg-orange/15 text-orange" : "bg-ink text-white"
          )}
        >
          {initial}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-52 w-56">
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2"
          onClick={() => router.push("/dashboard/settings")}
        >
          <UserRound className="size-4" />
          Open profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2"
          onClick={() => router.push("/dashboard/transactions")}
        >
          <History className="size-4" />
          History
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2"
          variant="destructive"
          onClick={() => void signOut()}
        >
          <LogOut className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
