import { createClient } from "@/lib/supabase/server";
import { ProfilClient } from "@/components/profil/ProfilClient";
import type { Profile } from "@/lib/types/database";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null };

  return <ProfilClient profile={profile!} />;
}
