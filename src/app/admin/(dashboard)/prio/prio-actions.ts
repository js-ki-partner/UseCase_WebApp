"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { generateToken } from "@/lib/tokens";

export interface PrioState {
  fehler?: string;
}

export async function erstelleRunde(
  _prev: PrioState,
  formData: FormData,
): Promise<PrioState> {
  const admin = await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const titel = String(formData.get("titel") ?? "").trim();
  const budget = Math.min(
    Math.max(parseInt(String(formData.get("budget") ?? "1000"), 10) || 1000, 100),
    100000,
  );
  const useCaseIds = formData.getAll("useCaseIds").map(String).filter(Boolean);

  if (!tenantId) return { fehler: "Bitte einen Kunden wählen." };
  if (titel.length < 2) return { fehler: "Bitte einen Titel angeben." };
  if (useCaseIds.length < 2) {
    return { fehler: "Bitte mindestens zwei Use Cases zur Abstimmung auswählen." };
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { fehler: "Kunde nicht gefunden." };

  // Nur Use Cases dieses Kunden zulassen
  const gueltige = await prisma.useCase.findMany({
    where: { id: { in: useCaseIds }, tenantId },
    select: { id: true },
  });

  const runde = await prisma.prioRunde.create({
    data: {
      tenantId,
      titel,
      budgetProTeilnehmer: budget,
      zugangsCode: generateToken(9),
      useCaseIds: gueltige.map((g) => g.id),
    },
  });
  await audit({
    actor: `admin:${admin.id}`,
    aktion: "prio.runde_erstellt",
    zielTyp: "prio_runde",
    zielId: runde.id,
    tenantId,
    detail: { karten: gueltige.length, budget },
  });
  revalidatePath("/admin/prio");
  redirect(`/admin/prio/${runde.id}`);
}

export async function setzeRundeOffen(
  prioRundeId: string,
  offen: boolean,
): Promise<void> {
  await requireAdmin();
  await prisma.prioRunde.update({
    where: { id: prioRundeId },
    data: { offen, geschlossenAm: offen ? null : new Date() },
  });
  revalidatePath(`/admin/prio/${prioRundeId}`);
  revalidatePath("/admin/prio");
}

export async function loescheRunde(prioRundeId: string): Promise<void> {
  await requireAdmin();
  await prisma.prioRunde.delete({ where: { id: prioRundeId } });
  revalidatePath("/admin/prio");
  redirect("/admin/prio");
}
