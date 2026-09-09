import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

// Schlankes Audit-Log (Konzept Abschnitt 7): Token-Rotation, Uebertragungen,
// Logins, Einreichungen. Bewusst ohne Inhalte — nur wer/was/wann.

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export interface AuditEintrag {
  actor: string;
  aktion: string;
  zielTyp?: string;
  zielId?: string;
  tenantId?: string;
  detail?: Record<string, unknown>;
}

export async function audit(eintrag: AuditEintrag): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actor: eintrag.actor,
        aktion: eintrag.aktion,
        zielTyp: eintrag.zielTyp ?? null,
        zielId: eintrag.zielId ?? null,
        tenantId: eintrag.tenantId ?? null,
        ip: await clientIp(),
        detail: eintrag.detail
          ? (eintrag.detail as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (e) {
    // Audit darf den Hauptvorgang nie scheitern lassen.
    console.error("Audit-Log fehlgeschlagen:", e);
  }
}
