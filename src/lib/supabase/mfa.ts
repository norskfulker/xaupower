import type { SupabaseClient, User } from "@supabase/supabase-js";

function hasVerifiedFactor(user: User) {
  return (user.factors ?? []).some((factor) => factor.status === "verified");
}

/** Uses getUser() + getClaims() so MFA is not decided from cookie session.user. */
export async function isMfaChallengePending(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !hasVerifiedFactor(user)) return false;

  const { data } = await supabase.auth.getClaims();
  return data?.claims?.aal === "aal1";
}
