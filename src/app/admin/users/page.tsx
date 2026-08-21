import { createClient } from "@/lib/supabase/server";
import { UsersTable } from "@/components/admin/users-table";
import { loadAdminUserRows } from "@/lib/admin-loaders";

export default async function AdminUsersPage() {
  const supabase = createClient();
  const rows = await loadAdminUserRows(supabase);
  return <UsersTable rows={rows} />;
}
