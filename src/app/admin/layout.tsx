import { AppHeader } from "@/components/layout/app-header";
import { getAuthUser, getOwnProfile, redirectIfMfaPending } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  await redirectIfMfaPending("/admin");

  const profile = await getOwnProfile(user.id);
  if (profile?.role !== "admin") {
    redirect("/dashboard?toast=no-access");
  }

  return (
    <AppHeader
      variant="admin"
      email={profile?.email}
      fullName={profile?.full_name}
      userId={user.id}
      isAdmin
      memberLabel="Admin"
    >
      <div className="space-y-10">{children}</div>
    </AppHeader>
  );
}
