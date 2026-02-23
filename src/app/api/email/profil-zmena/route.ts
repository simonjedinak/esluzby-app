import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMail, FROM } from "@/lib/email";

export interface ProfilZmena {
  pole: string;
  stara: string;
  nova: string;
}

interface RequestBody {
  userEmail: string;
  userMeno: string;
  adminMeno: string;
  zmeny: ProfilZmena[];
}

export async function POST(req: NextRequest) {
  // Require authenticated admin session
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

  const body: RequestBody = await req.json();
  const { userEmail, userMeno, adminMeno, zmeny } = body;

  if (!userEmail || !userMeno || !adminMeno || !zmeny?.length) {
    return NextResponse.json(
      { error: "Chýbajú povinné polia" },
      { status: 400 },
    );
  }

  const zmenyRows = zmeny
    .map(
      (z) => `
        <tr>
          <td style="padding: 10px 12px; background: #f1f5f9; font-weight: 600;">${z.pole}</td>
          <td style="padding: 10px 12px; background: #fff; color: #dc2626; text-decoration: line-through;">${z.stara || "—"}</td>
          <td style="padding: 10px 12px; background: #fff; color: #16a34a; font-weight: 600;">${z.nova || "—"}</td>
        </tr>
      `,
    )
    .join("");

  try {
    await sendMail({
      from: FROM,
      to: userEmail,
      subject: "Váš profil v eSlužby bol zmenený",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
          <div style="background: #7c3aed; padding: 16px 24px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; color: #fff; font-size: 18px;">Zmena profilu</h2>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
            <p style="margin-top: 0;">Ahoj <strong>${userMeno}</strong>,</p>
            <p>Administrátor <strong>${adminMeno}</strong> vykonal/a zmeny vo vašom profile.</p>

            <table style="width:100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <thead>
                <tr>
                  <th style="padding: 8px 12px; background: #e2e8f0; text-align: left; border-radius: 6px 0 0 0; font-size: 12px; color: #64748b;">Pole</th>
                  <th style="padding: 8px 12px; background: #e2e8f0; text-align: left; font-size: 12px; color: #64748b;">Pred zmenou</th>
                  <th style="padding: 8px 12px; background: #e2e8f0; text-align: left; border-radius: 0 6px 0 0; font-size: 12px; color: #64748b;">Po zmene</th>
                </tr>
              </thead>
              <tbody>
                ${zmenyRows}
              </tbody>
            </table>

            <p style="font-size: 13px; color: #475569;">
              Ak si myslíte, že táto zmena bola vykonaná omylom, kontaktujte administrátora.
            </p>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Tento email bol odoslaný automaticky systémom eSlužby. Neodpovedajte naň.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to send profil-zmena email:", err);
    return NextResponse.json(
      { error: "Nepodarilo sa odoslať email" },
      { status: 500 },
    );
  }
}
