import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendMail, FROM, temaMessageId } from "@/lib/email";

interface RequestBody {
  temaId: string;
  temaNazov: string;
  temaDatum: string;
  reporterEmail: string;
  reporterMeno: string;
  autorMeno: string;
  komentar: string;
}

export async function POST(req: NextRequest) {
  // Require authenticated session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: RequestBody = await req.json();
  const {
    temaId,
    temaNazov,
    temaDatum,
    reporterEmail,
    reporterMeno,
    autorMeno,
    komentar,
  } = body;

  if (!temaId || !temaNazov || !reporterEmail || !autorMeno || !komentar) {
    return NextResponse.json(
      { error: "Chýbajú povinné polia" },
      { status: 400 },
    );
  }

  const threadRefId = temaMessageId(temaId);

  try {
    await sendMail({
      from: FROM,
      to: reporterEmail,
      subject: `Re: Komentár k téme: ${temaNazov}`,
      // Thread headers — links this reply into the same conversation as the approval email
      headers: {
        "In-Reply-To": threadRefId,
        References: threadRefId,
      },
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1e293b;">
          <div style="background: #3b82f6; padding: 16px 24px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; color: #fff; font-size: 18px;">Nový komentár k téme</h2>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
            <p style="margin-top: 0;">Ahoj <strong>${reporterMeno}</strong>,</p>
            <p>K tvojej téme bol pridaný nový komentár.</p>

            <table style="width:100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr>
                <td style="padding: 10px 12px; background: #f1f5f9; font-weight: 600; width: 40%; border-radius: 6px 0 0 0;">Téma</td>
                <td style="padding: 10px 12px; background: #fff; border-radius: 0 6px 0 0;">${temaNazov}</td>
              </tr>
              <tr>
                <td style="padding: 10px 12px; background: #f1f5f9; font-weight: 600; border-radius: 0 0 0 6px;">Dátum</td>
                <td style="padding: 10px 12px; background: #fff; border-radius: 0 0 6px 0;">${temaDatum}</td>
              </tr>
            </table>

            <div style="border-left: 3px solid #3b82f6; padding: 12px 16px; background: #fff; border-radius: 0 8px 8px 0; margin-top: 16px;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #3b82f6;">${autorMeno}</p>
              <p style="margin: 0; font-size: 14px; color: #1e293b;">"${komentar}"</p>
            </div>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              Tento email bol odoslaný automaticky systémom e-jano. Neodpovedajte naň.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to send tema-komentar email:", err);
    return NextResponse.json(
      { error: "Nepodarilo sa odoslať email" },
      { status: 500 },
    );
  }
}
