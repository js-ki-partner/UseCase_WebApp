"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateToken, hashToken } from "@/lib/tokens";
import { tenantFormSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";

export interface TenantState {
  ok?: boolean;
  fehler?: string;
  feldFehler?: Record<string, string>;
  klartextToken?: string;
  tokenGueltigBis?: string;
  hinweis?: string;
  /** nach dem Anlegen: ID/Slug des neuen Kunden für die Verlinkung */
  tenantId?: string;
  slug?: string;
  name?: string;
}

function gueltigTageAus(formData: FormData, fallback = 365): number {
  const roh = String(formData.get("tokenGueltigTage") ?? formData.get("gueltigTage") ?? fallback);
  return Math.min(Math.max(parseInt(roh, 10) || fallback, 1), 3650);
}

async function setzeToken(tenantId: string, tage: number): Promise<string> {
  const token = generateToken(18);
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      accessTokenHash: hashToken(token),
      tokenExpiresAt: new Date(Date.now() + tage * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

function felder(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    out[k] ??= i.message;
  }
  return out;
}

function parse(formData: FormData) {
  return tenantFormSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    openprojectProjectId: formData.get("openprojectProjectId"),
    stundensatzDefault: formData.get("stundensatzDefault"),
    brandingLogoUrl: formData.get("brandingLogoUrl"),
    brandingAccentColor: formData.get("brandingAccentColor"),
  });
}

export async function erstelleTenant(
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const admin = await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { feldFehler: felder(parsed.error) };

  const existiert = await prisma.tenant.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existiert) return { fehler: "Ein Kunde mit diesem Slug existiert bereits." };

  const tenant = await prisma.tenant.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      openprojectProjectId: parsed.data.openprojectProjectId ?? null,
      stundensatzDefault: parsed.data.stundensatzDefault,
      brandingLogoUrl: parsed.data.brandingLogoUrl ?? null,
      brandingAccentColor: parsed.data.brandingAccentColor ?? null,
      zeigtBewertung: formData.get("zeigtBewertung") === "on",
      kiAktiviert: formData.get("kiAktiviert") === "on",
    },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "tenant.angelegt",
    zielTyp: "tenant",
    zielId: tenant.id,
    tenantId: tenant.id,
    detail: { slug: tenant.slug },
  });

  const result: TenantState = {
    ok: true,
    tenantId: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    hinweis: `Kunde „${tenant.name}" angelegt.`,
  };

  if (formData.get("tokenErzeugen") === "on") {
    const tage = gueltigTageAus(formData);
    const token = await setzeToken(tenant.id, tage);
    await audit({
      actor: `admin:${admin.id}`,
      aktion: "tenant.token_rotiert",
      zielTyp: "tenant",
      zielId: tenant.id,
      tenantId: tenant.id,
      detail: { gueltigTage: tage, beiAnlage: true },
    });
    result.klartextToken = token;
    result.tokenGueltigBis = new Date(
      Date.now() + tage * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("de-DE");
  }

  revalidatePath("/admin/tenants");
  return result;
}

export async function aktualisiereTenant(
  tenantId: string,
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { feldFehler: felder(parsed.error) };

  const kollision = await prisma.tenant.findFirst({
    where: { slug: parsed.data.slug, id: { not: tenantId } },
  });
  if (kollision) return { fehler: "Der Slug wird bereits von einem anderen Kunden genutzt." };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      openprojectProjectId: parsed.data.openprojectProjectId ?? null,
      stundensatzDefault: parsed.data.stundensatzDefault,
      brandingLogoUrl: parsed.data.brandingLogoUrl ?? null,
      brandingAccentColor: parsed.data.brandingAccentColor ?? null,
      zeigtBewertung: formData.get("zeigtBewertung") === "on",
      kiAktiviert: formData.get("kiAktiviert") === "on",
    },
  });
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { ok: true, hinweis: "Gespeichert." };
}

/** Neues Zugangstoken erzeugen. Klartext wird einmalig zurueckgegeben. */
export async function rotiereToken(
  tenantId: string,
  _prev: TenantState,
  formData: FormData,
): Promise<TenantState> {
  const admin = await requireAdmin();
  const tage = gueltigTageAus(formData);

  const token = await setzeToken(tenantId, tage);
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "tenant.token_rotiert",
    zielTyp: "tenant",
    zielId: tenantId,
    tenantId,
    detail: { gueltigTage: tage },
  });
  revalidatePath(`/admin/tenants/${tenantId}`);
  return {
    ok: true,
    klartextToken: token,
    tokenGueltigBis: new Date(
      Date.now() + tage * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("de-DE"),
    hinweis: "Neues Token erzeugt. Bitte jetzt kopieren — es wird nicht erneut angezeigt.",
  };
}

export async function widerrufeToken(tenantId: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { accessTokenHash: null, tokenExpiresAt: null },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "tenant.token_widerrufen",
    zielTyp: "tenant",
    zielId: tenantId,
    tenantId,
  });
  revalidatePath(`/admin/tenants/${tenantId}`);
}
