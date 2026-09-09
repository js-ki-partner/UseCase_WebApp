import { z } from "zod";

export const FREQUENZ_WERTE = [
  "TAEGLICH",
  "MEHRMALS_WOECHENTLICH",
  "WOECHENTLICH",
  "MONATLICH",
  "SELTENER",
] as const;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === undefined || v === "" ? undefined : v));

// Stufe 1 — Kurzerfassung (Konzept Abschnitt 4.2)
export const kurzerfassungSchema = z.object({
  problemText: z
    .string()
    .trim()
    .min(10, "Bitte beschreiben Sie das Problem in ein bis zwei Sätzen.")
    .max(4000),
  rolle: z.string().trim().min(2, "Bitte Rolle oder Abteilung angeben.").max(200),
  anzahlBetroffene: z.coerce
    .number()
    .int("Bitte eine ganze Zahl angeben.")
    .min(1, "Mindestens eine Person.")
    .max(100000),
  frequenz: z.enum(FREQUENZ_WERTE),
  dauerMinuten: z.coerce
    .number()
    .int()
    .min(1, "Bitte eine Dauer angeben.")
    .max(1440),
  wunschergebnis: optionalString(4000),
  einreicherName: optionalString(200),
  einreicherEmail: z
    .union([z.literal(""), z.email("Bitte eine gültige E-Mail-Adresse angeben.")])
    .transform((v) => (v ? v : undefined))
    .optional(),
  istAnonym: z.boolean().optional(),
});

export type KurzerfassungInput = z.infer<typeof kurzerfassungSchema>;

// Stufe 2 — Prozessschritte (Konzept Abschnitt 4.3)
export const SYSTEM_VORSCHLAEGE = [
  "E-Mail / Outlook",
  "ERP / SAP",
  "CRM",
  "Excel / Tabelle",
  "DMS / Dokumentenablage",
  "Ticketsystem",
  "Warenwirtschaft",
  "Buchhaltungssoftware",
  "Webportal / Kundenportal",
  "Papier / manuell",
] as const;

export const prozessschrittSchema = z.object({
  bezeichnung: z.string().trim().min(2, "Bitte den Schritt benennen.").max(200),
  input: optionalString(500),
  output: optionalString(500),
  system: optionalString(200),
  dauerMinuten: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(1440)])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  hatWartezeit: z.boolean().optional(),
  brauchtEntscheidung: z.boolean().optional(),
});

export const prozessschritteSchema = z
  .array(prozessschrittSchema)
  .max(40, "Bitte auf höchstens 40 Schritte beschränken.");

export type ProzessschrittInput = z.infer<typeof prozessschrittSchema>;

export const adminLoginSchema = z.object({
  email: z.email().max(320),
  passwort: z.string().min(1).max(200),
});

export const adminTotpSchema = z.object({
  code: z.string().trim().min(6).max(10),
});

export const tenantFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "Nur Kleinbuchstaben, Ziffern und Bindestrich."),
  name: z.string().trim().min(2).max(200),
  openprojectProjectId: optionalString(60),
  stundensatzDefault: z.coerce.number().int().min(0).max(100000),
  brandingLogoUrl: z
    .union([z.literal(""), z.url().max(500)])
    .transform((v) => (v ? v : undefined))
    .optional(),
  brandingAccentColor: z
    .union([
      z.literal(""),
      z.string().regex(/^#[0-9a-fA-F]{6}$/, "Hex-Farbe, z. B. #1d4ed8."),
    ])
    .transform((v) => (v ? v : undefined))
    .optional(),
});
