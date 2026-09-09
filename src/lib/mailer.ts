import { env } from "./env";

// Schlanke Mail-Abstraktion. Ohne SMTP_URL wird nur in die Konsole geloggt
// (Entwicklung). Produktion: SMTP_URL setzen; nodemailer wird dann lazy geladen.

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

// Harte Obergrenze, damit ein langsamer/falsch konfigurierter SMTP-Server nie
// eine Server Action blockiert (z. B. die Kurzerfassung). nodemailer bekommt
// zusaetzlich eigene, kuerzere Timeouts.
const VERSAND_TIMEOUT_MS = 15_000;

interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
}

/** SMTP_URL (smtp://user:pass@host:port bzw. smtps://…) in nodemailer-Optionen. */
function parseSmtpUrl(smtpUrl: string): SmtpOptions {
  // Haeufige Fehler abfangen: umschliessende Anführungszeichen, fehlendes Schema.
  let roh = smtpUrl.trim().replace(/^['"]|['"]$/g, "");
  if (!/^smtps?:\/\//i.test(roh)) roh = "smtp://" + roh;
  let u: URL;
  try {
    u = new URL(roh);
  } catch {
    throw new Error(
      `SMTP_URL ist keine gültige URL. Erwartet: smtps://benutzer:passwort@mailserver:465 ` +
        `(Sonderzeichen im Passwort URL-kodieren: @ -> %40, : -> %3A, / -> %2F).`,
    );
  }
  const port = u.port ? Number(u.port) : u.protocol === "smtps:" ? 465 : 587;
  // Port 465 ist implizit TLS — haeufige Fehlkonfiguration: smtp:// statt smtps://
  const secure = u.protocol === "smtps:" || port === 465;
  return {
    host: u.hostname,
    port,
    secure,
    auth: u.username
      ? {
          user: decodeURIComponent(u.username),
          pass: decodeURIComponent(u.password),
        }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 12_000,
  };
}

export async function sendeMail(mail: Mail): Promise<void> {
  const { smtpUrl, from } = env.mail();

  if (!smtpUrl) {
    console.info(
      `\n--- E-Mail (kein SMTP konfiguriert) ---\nAn: ${mail.to}\nBetreff: ${mail.subject}\n\n${mail.text}\n--------------------------------------\n`,
    );
    return;
  }

  // nodemailer ist eine Laufzeit-Abhaengigkeit (nur wenn SMTP genutzt wird).
  const mod = await import(
    /* webpackIgnore: true */ "nodemailer" as string
  ).catch(() => null);
  if (!mod) {
    throw new Error(
      "SMTP_URL ist gesetzt, aber 'nodemailer' ist nicht installiert (npm i nodemailer).",
    );
  }
  const nodemailer = (mod.default ?? mod) as {
    createTransport: (opts: SmtpOptions) => {
      sendMail: (opts: Record<string, unknown>) => Promise<unknown>;
      close: () => void;
    };
  };

  const transport = nodemailer.createTransport(parseSmtpUrl(smtpUrl));
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text }),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Mailversand-Timeout nach ${VERSAND_TIMEOUT_MS} ms`)),
          VERSAND_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    transport.close();
  }
}
