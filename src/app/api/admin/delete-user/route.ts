import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  // Verify caller is admin
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("roly")
    .eq("id", user.id)
    .single();

  if (!callerProfile?.roly?.includes("admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "Chýba userId" }, { status: 400 });
  }

  // Prevent self-deletion
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Nemôžete odstrániť vlastný účet" },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
