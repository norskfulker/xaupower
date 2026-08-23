import { createClient, getAuthUser, getOwnProfile } from "@/lib/supabase/server";
import {
  NotificationSettings,
  ProfileSettings,
  SavedAddressesSettings,
  SecuritySettings,
} from "@/components/settings/settings-panel";
import type { NotificationPreferences, SavedPayoutAddress } from "@/lib/types";
import { redirect } from "next/navigation";

const DEFAULT_PREFS: NotificationPreferences = {
  email_deposits: true,
  email_payouts: true,
};

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const supabase = createClient();
  const [profile, savedRes] = await Promise.all([
    getOwnProfile(user.id),
    supabase
      .from("saved_payout_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  const prefs = {
    ...DEFAULT_PREFS,
    ...(profile?.notification_preferences ?? {}),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ProfileSettings
        userId={user.id}
        email={profile?.email ?? user.email ?? ""}
        fullName={profile?.full_name ?? ""}
        phone={profile?.phone ?? ""}
        memberSince={profile?.created_at ?? user.created_at}
      />
      <SecuritySettings />
      <NotificationSettings userId={user.id} initial={prefs} />
      <SavedAddressesSettings
        userId={user.id}
        initial={(savedRes.data ?? []) as SavedPayoutAddress[]}
      />
    </div>
  );
}
