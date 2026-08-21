"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function SignOutButton({
  tone = "light",
}: {
  tone?: "light" | "dark";
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start",
        tone === "dark"
          ? "text-white/80 hover:bg-white/10 hover:text-white"
          : "text-ink/70 hover:bg-orange/10 hover:text-ink"
      )}
      onClick={signOut}
    >
      Sign out
    </Button>
  );
}
