import { env } from "./env";
import { prisma } from "./prisma";
import { sendeMail } from "./mailer";
import { generateToken, hashToken } from "./tokens";

const GUELTIG_TAGE = 14;

/**
 * Erzeugt einen Rueckkehr-Link zu einem eigenen Entwurf (Konzept Abschnitt 5)
 * und verschickt ihn. Kein Konto noetig.
 */
export async function sendeMagicLink(useCaseId: string, email: string): Promise<void> {
  const token = generateToken(24);
  const expiresAt = new Date(Date.now() + GUELTIG_TAGE * 24 * 60 * 60 * 1000);

  await prisma.magicLink.create({
    data: { tokenHash: hashToken(token), useCaseId, email, expiresAt },
  });

  const url = `${env.appBaseUrl()}/r/${token}`;
  await sendeMail({
    to: email,
    subject: "Ihr Use Case bei UC-Radar — Link zum Ergänzen",
    text: [
      "Vielen Dank für Ihre Einreichung.",
      "",
      "Über diesen Link können Sie Ihren Eintrag später ergänzen oder korrigieren:",
      url,
      "",
      `Der Link ist ${GUELTIG_TAGE} Tage gültig.`,
    ].join("\n"),
  });
}

export interface MagicLinkTreffer {
  useCaseId: string;
  tenantId: string;
  tenantSlug: string;
}

/** Loest ein Magic-Link-Token auf und markiert es als benutzt. */
export async function loeseMagicLink(token: string): Promise<MagicLinkTreffer | null> {
  const link = await prisma.magicLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { useCase: { include: { tenant: true } } },
  });
  if (!link) return null;
  if (link.expiresAt.getTime() < Date.now()) return null;

  if (!link.usedAt) {
    await prisma.magicLink.update({
      where: { id: link.id },
      data: { usedAt: new Date() },
    });
  }

  return {
    useCaseId: link.useCaseId,
    tenantId: link.useCase.tenantId,
    tenantSlug: link.useCase.tenant.slug,
  };
}
