import { createClient } from "@/lib/supabase/server";
import { DomovClient } from "@/components/domov/DomovClient";
import type { Profile } from "@/lib/types/database";

export default async function DomovPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null };

  const { data: allProfiles } = (await supabase
    .from("profiles")
    .select("*")
    .order("priezvisko")) as { data: Profile[] | null };

  return (
    <DomovClient currentProfile={profile!} allProfiles={allProfiles || []} />
  );
}
