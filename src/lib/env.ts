// Zentraler, typisierter Zugriff auf Umgebungsvariablen.

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    throw new Error(`Umgebungsvariable ${name} fehlt. Siehe .env.example.`);
  }
  return v;
}

function opt(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

/** Erster gesetzter Wert aus mehreren möglichen Variablennamen. */
function optAny(names: string[], fallback = ""): string {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length > 0) return v;
  }
  return fallback;
}

export const env = {
  databaseUrl: () => req("DATABASE_URL"),
  appBaseUrl: () => opt("APP_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: () => req("SESSION_SECRET"),
  tokenHashSecret: () => req("TOKEN_HASH_SECRET"),
  // Konvention KI Partner (siehe OPENPROJECT_ZUGANG.md): OP_BASE_URL / OP_API_KEY.
  // OPENPROJECT_* wird als Alias weiterhin akzeptiert.
  openproject: () => ({
    baseUrl: optAny(["OP_BASE_URL", "OPENPROJECT_BASE_URL"]).replace(/\/$/, ""),
    apiKey: optAny(["OP_API_KEY", "OPENPROJECT_API_KEY"]),
    mappingFile: optAny(
      ["OP_MAPPING_FILE", "OPENPROJECT_MAPPING_FILE"],
      "./openproject-mapping.json",
    ),
  }),
  mail: () => ({
    smtpUrl: opt("SMTP_URL"),
    from: opt("MAIL_FROM", "UC-Radar <ideen@ki-partner.tech>"),
  }),
  // Bearer-Token für interne Jobs (z. B. Status-Rücklesen per Cron). Leer = Job deaktiviert.
  jobToken: () => opt("JOB_TOKEN"),
};
