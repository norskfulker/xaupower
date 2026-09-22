import { redirect } from "next/navigation";
import { getAuthUser, getOwnProfile } from "@/lib/supabase/server";
import { getReferralLeaderboard } from "@/lib/supabase/accounts";
import { ReferralWorkspace } from "@/components/referrals/referral-workspace";

export const metadata = {
  title: "Referrals — XAUPower",
};

export default async function ReferralsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const profile = await getOwnProfile(user.id);
  if (!profile) redirect("/login");

  const leaderboard = await getReferralLeaderboard();

  return <ReferralWorkspace profile={profile} leaderboard={leaderboard} />;
}
