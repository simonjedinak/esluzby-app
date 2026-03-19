import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/current-user";
import { ProfilClient } from "@/components/profil/ProfilClient";
import type { Profile, DennyStav, Tema, Volno } from "@/lib/types/database";
import { redirect } from "next/navigation";

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const { user, profile: currentProfile } = await getCurrentUserAndProfile();
  if (!user || !currentProfile) {
    redirect("/login");
  }

  // Target profile (self or other user if admin viewing)
  const targetId = params.user || user.id;
  const isOwnProfile = targetId === user.id;
  const { data: targetProfile } = isOwnProfile
    ? { data: currentProfile }
    : ((await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .single()) as { data: Profile | null });

  // Fetch denny_stav for last 3 months
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const { data: denneStavy } = (await supabase
    .from("denny_stav")
    .select("*")
    .eq("reporter_id", targetId)
    .gte("datum", threeMonthsAgo.toISOString().split("T")[0])
    .order("datum")) as { data: DennyStav[] | null };

  // Fetch all temy for target user
  const { data: temy } = (await supabase
    .from("temy")
    .select("*")
    .eq("reporter_id", targetId)
    .order("datum", { ascending: false })) as { data: Tema[] | null };

  // Fetch all volna for target user
  const { data: volna } = (await supabase
    .from("volna")
    .select("*")
    .eq("reporter_id", targetId)
    .order("datum_od", { ascending: false })) as { data: Volno[] | null };

  return (
    <ProfilClient
      profile={targetProfile!}
      currentProfile={currentProfile!}
      isOwnProfile={isOwnProfile}
      denneStavy={denneStavy || []}
      temy={temy || []}
      volna={volna || []}
    />
  );
}
