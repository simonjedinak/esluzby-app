import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/AdminClient";
import type { Profile } from "@/lib/types/database";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null };

  if (!profile || profile.rola !== "admin") {
    redirect("/domov");
  }

  const { data: allProfiles } = (await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })) as { data: Profile[] | null };

  return <AdminClient profiles={allProfiles || []} />;
}
