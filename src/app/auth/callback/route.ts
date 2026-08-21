import { createClient } from "@/lib/supabase/server";
import { isMfaChallengePending } from "@/lib/supabase/mfa";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let redirectPath = next;
      if (user) {
        if (await isMfaChallengePending(supabase)) {
          const dest = new URL("/auth/mfa", origin);
          dest.searchParams.set("next", next);
          return NextResponse.redirect(dest);
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          redirectPath = "/admin";
        } else if (next.startsWith("/admin")) {
          redirectPath = "/dashboard";
        }
      }

      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
