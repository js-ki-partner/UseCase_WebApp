import { env } from "./env";

// Schlanke Mail-Abstraktion. Ohne SMTP_URL wird nur in die Konsole geloggt
// (Entwicklung). Produktion: SMTP_URL setzen; nodemailer wird dann lazy geladen.

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendeMail(mail: Mail): Promise<void> {
  const { smtpUrl, from } = env.mail();

  if (!smtpUrl) {
    console.info(
      `\n--- E-Mail (kein SMTP konfiguriert) ---\nAn: ${mail.to}\nBetreff: ${mail.subject}\n\n${mail.text}\n--------------------------------------\n`,
    );
    return;
  }

  // nodemailer ist eine optionale Laufzeit-Abhaengigkeit (nur wenn SMTP genutzt wird).
  const mod = await import(
    /* webpackIgnore: true */ "nodemailer" as string
  ).catch(() => null);
  if (!mod) {
    throw new Error(
      "SMTP_URL ist gesetzt, aber 'nodemailer' ist nicht installiert (npm i nodemailer).",
    );
  }
  const nodemailer = (mod.default ?? mod) as {
    createTransport: (url: string) => {
      sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
    };
  };
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text });
}
