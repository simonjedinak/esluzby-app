import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendMail, FROM } from "@/lib/email";

export async function POST(req: NextRequest) {
  // Verify the calling user is an admin
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

  // Parse body
  const { email, password, meno, priezvisko, roly } = await req.json();

  if (!email || !password || !meno || !priezvisko || !roly) {
    return NextResponse.json(
      { error: "Chýbajú povinné polia" },
      { status: 400 },
    );
  }

  // Create user via admin API (email auto-confirmed, no verification email)
  const adminClient = createAdminClient();
  const { data: newUser, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { meno, priezvisko, roly },
    });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // Send welcome email via Gmail (fire-and-forget — don't block the response)
  sendMail({
    from: FROM,
    to: email,
    subject: "Váš účet v e-jano bol vytvorený",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1d4ed8;">Vitajte v e-jano, ${meno}!</h2>
          <p>Bol vám vytvorený účet. Tu sú vaše prihlasovacie údaje:</p>
          <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; border-radius: 4px 0 0 4px;">Email</td>
              <td style="padding: 8px 12px; background: #f8fafc; border-radius: 0 4px 4px 0;">${email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; background: #f1f5f9; font-weight: bold; border-radius: 4px 0 0 4px;">Heslo</td>
              <td style="padding: 8px 12px; background: #f8fafc; border-radius: 0 4px 4px 0;"><strong>${password}</strong></td>
            </tr>
          </table>
          <p style="margin: 16px 0;">Prihláste sa na: <a href="https://www.ejano.vercel.app" style="color:#1d4ed8; text-decoration:none;">https://www.ejano.vercel.app</a></p>
          <p style="text-align:center; margin: 12px 0;"><a href="https://www.ejano.vercel.app" style="background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">Prihlásiť sa</a></p>
          <p style="color: #dc2626; font-weight: bold;">⚠️ Po prvom prihlásení si prosím zmeňte heslo v nastaveniach profilu.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #64748b; font-size: 13px;">Tento email bol odoslaný automaticky. Neodpovedajte naň.</p>
        </div>
      `,
  }).catch((mailError) => {
    console.error("Failed to send welcome email:", mailError);
  });

  return NextResponse.json({ userId: newUser.user?.id }, { status: 201 });
}
