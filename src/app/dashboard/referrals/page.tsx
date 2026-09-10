import { createClient, getAuthUser, getOwnProfile } from "@/lib/supabase/server";
import { ReferralWorkspace } from "@/components/referrals/referral-workspace";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Referrals — XAUPower",
};

export default async function ReferralsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const profile = await getOwnProfile(user.id);
  if (!profile) redirect("/login");

  const { data: referred } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("referred_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <ReferralWorkspace
      referralCode={profile.referral_code}
      wasReferred={Boolean(profile.referred_by)}
      referredMembers={referred ?? []}
    />
  );
}
