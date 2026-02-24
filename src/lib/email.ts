import nodemailer from "nodemailer";

export function createTransporter() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (nodemailer.createTransport as any)({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    family: 4,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  }) as ReturnType<typeof nodemailer.createTransport>;
}

export const FROM = `"e-jano" <${process.env.GMAIL_USER}>`;

/** Deterministic Message-ID for a given tema — allows threading without DB changes */
export function temaMessageId(temaId: string) {
  return `<tema-${temaId}@e-jano>`;
}

export async function sendMail(options: nodemailer.SendMailOptions) {
  const transporter = createTransporter();
  return transporter.sendMail(options);
}
