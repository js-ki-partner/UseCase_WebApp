"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateToken, hashToken } from "@/lib/tokens";
import { env } from "@/lib/env";
import { sendeMail } from "@/lib/mailer";

export interface KontaktState {
  fehler?: string;
  hinweis?: string;
  klartextLink?: string;
}

const GUELTIG_TAGE = 180;

function ablauf(): Date {
  return new Date(Date.now() + GUELTIG_TAGE * 24 * 60 * 60 * 1000);
}

async function neuerZugang(kontaktId: string): Promise<string> {
  const token = generateToken(20);
  await prisma.tenantKontakt.update({
    where: { id: kontaktId },
    data: { zugangTokenHash: hashToken(token), tokenExpiresAt: ablauf() },
  });
  return `${env.appBaseUrl()}/k/${token}`;
}

export async function erstelleKontakt(
  tenantId: string,
  _prev: KontaktState,
  formData: FormData,
): Promise<KontaktState> {
  const admin = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const mailSenden = formData.get("mailSenden") === "on";

  if (name.length < 2) return { fehler: "Bitte einen Namen angeben." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fehler: "Bitte eine gültige E-Mail-Adresse angeben." };
  }

  const kontakt = await prisma.tenantKontakt.create({
    data: { tenantId, name, email },
  });
  const link = await neuerZugang(kontakt.id);

  await audit({
    actor: `admin:${admin.id}`,
    aktion: "kontakt.angelegt",
    zielTyp: "tenant_kontakt",
    zielId: kontakt.id,
    tenantId,
  });

  if (mailSenden) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    await sendeMail({
      to: email,
      subject: `Ihr Zugang zum Use-Case-Portfolio${tenant ? ` (${tenant.name})` : ""}`,
      text: [
        `Hallo ${name},`,
        "",
        "über diesen Link erreichen Sie das Use-Case-Portfolio Ihres Hauses:",
        link,
        "",
        `Der Link ist ${GUELTIG_TAGE} Tage gültig. Bitte nicht weitergeben.`,
      ].join("\n"),
    }).catch((e) => console.error("Kontakt-Mail fehlgeschlagen:", e));
  }

  revalidatePath(`/admin/tenants/${tenantId}`);
  return {
    hinweis: mailSenden
      ? `Angelegt. Zugangslink an ${email} verschickt.`
      : "Angelegt. Zugangslink jetzt kopieren — er wird nicht erneut angezeigt.",
    klartextLink: mailSenden ? undefined : link,
  };
}

export async function rotiereKontaktZugang(
  kontaktId: string,
): Promise<KontaktState> {
  const admin = await requireAdmin();
  const kontakt = await prisma.tenantKontakt.findUnique({ where: { id: kontaktId } });
  if (!kontakt) return { fehler: "Kontakt nicht gefunden." };
  const link = await neuerZugang(kontaktId);
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "kontakt.zugang_rotiert",
    zielTyp: "tenant_kontakt",
    zielId: kontaktId,
    tenantId: kontakt.tenantId,
  });
  revalidatePath(`/admin/tenants/${kontakt.tenantId}`);
  return { hinweis: "Neuer Zugangslink erzeugt.", klartextLink: link };
}

export async function widerrufeKontaktZugang(kontaktId: string): Promise<void> {
  const admin = await requireAdmin();
  const kontakt = await prisma.tenantKontakt.update({
    where: { id: kontaktId },
    data: { zugangTokenHash: null, tokenExpiresAt: null },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "kontakt.zugang_widerrufen",
    zielTyp: "tenant_kontakt",
    zielId: kontaktId,
    tenantId: kontakt.tenantId,
  });
  revalidatePath(`/admin/tenants/${kontakt.tenantId}`);
}

export async function loescheKontakt(kontaktId: string): Promise<void> {
  await requireAdmin();
  const kontakt = await prisma.tenantKontakt.delete({ where: { id: kontaktId } });
  revalidatePath(`/admin/tenants/${kontakt.tenantId}`);
}
