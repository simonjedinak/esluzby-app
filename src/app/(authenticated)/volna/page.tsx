import { createClient } from "@/lib/supabase/server";
import { VolnaClient } from "@/components/volna/VolnaClient";
import type { Profile, Volno } from "@/lib/types/database";

export default async function VolnaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single()) as { data: Profile | null };

  const { data: volna } = (await supabase
    .from("volna")
    .select("*")
    .order("datum_od", { ascending: false })) as { data: Volno[] | null };

  const { data: allProfiles } = (await supabase
    .from("profiles")
    .select("*")) as { data: Profile[] | null };

  return (
    <VolnaClient
      currentProfile={profile!}
      volna={volna || []}
      allProfiles={allProfiles || []}
    />
  );
}
