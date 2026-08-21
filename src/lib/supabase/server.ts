import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isMfaChallengePending } from "@/lib/supabase/mfa";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        encode: "tokens-only",
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    }
  );
}

export const getAuthUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getOwnProfile = cache(async (userId: string) => {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, phone, notification_preferences, created_at")
    .eq("id", userId)
    .single();
  return data;
});

export const getPriceQuotes = cache(async () => {
  const supabase = createClient();
  const { data } = await supabase
    .from("price_cache")
    .select("pair, price, change_pct, fetched_at")
    .eq("pair", "XAUUSD");
  return (data ?? []) as import("@/lib/prices").PriceQuote[];
});

export async function redirectIfMfaPending(nextPath: string) {
  const supabase = createClient();
  const pending = await isMfaChallengePending(supabase);
  if (pending) {
    redirect(`/auth/mfa?next=${encodeURIComponent(nextPath)}`);
  }
}
