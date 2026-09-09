"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import {
  KONFIDENZ_WERTE,
  DATENLAGE_WERTE,
  FEHLERKOSTEN_WERTE,
  KO_FRAGEN,
  koBestanden,
  type KoKriterien,
} from "@/lib/bewertung";

export interface BewertungState {
  ok?: boolean;
  fehler?: string;
  hinweis?: string;
}

function zahlOderNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function enumOderNull<T extends readonly string[]>(
  v: FormDataEntryValue | null,
  erlaubt: T,
): T[number] | null {
  const s = String(v ?? "").trim();
  return (erlaubt as readonly string[]).includes(s) ? (s as T[number]) : null;
}

export async function speichereBewertung(
  useCaseId: string,
  _prev: BewertungState,
  formData: FormData,
): Promise<BewertungState> {
  const admin = await requireAdmin();

  const uc = await prisma.useCase.findUnique({
    where: { id: useCaseId },
    select: { id: true, tenantId: true, status: true },
  });
  if (!uc) return { fehler: "Use Case nicht gefunden." };

  // K.-o.-Kriterien
  const ko: KoKriterien = { begruendung: String(formData.get("ko_begruendung") ?? "").trim() || undefined };
  for (const f of KO_FRAGEN) {
    const val = formData.get(`ko_${f.key}`);
    ko[f.key] = val === "ja" ? true : val === "nein" ? false : undefined;
  }
  const alleBeantwortet = KO_FRAGEN.every((f) => ko[f.key] !== undefined);
  const bestanden = koBestanden(ko);

  if (!bestanden && !ko.begruendung) {
    return {
      fehler:
        "Wenn eine K.-o.-Frage mit »nein« beantwortet ist, bitte eine kurze Begründung angeben (geht in die Warteliste).",
    };
  }

  const wertMin = zahlOderNull(formData.get("wertMin"));
  const wertReal = zahlOderNull(formData.get("wertReal"));
  const wertMax = zahlOderNull(formData.get("wertMax"));
  const konfidenz = enumOderNull(formData.get("konfidenz"), KONFIDENZ_WERTE);
  const datenlage = enumOderNull(formData.get("datenlage"), DATENLAGE_WERTE);
  const fehlerkosten = enumOderNull(formData.get("fehlerkosten"), FEHLERKOSTEN_WERTE);
  const ownerBeimKunden = String(formData.get("ownerBeimKunden") ?? "").trim() || null;
  const notizIntern = String(formData.get("notizIntern") ?? "").trim() || null;

  const hatWerte = wertMin != null || wertReal != null || wertMax != null;
  const daten = {
    wertMin,
    wertReal,
    wertMax,
    konfidenz,
    datenlage,
    fehlerkosten,
    ownerBeimKunden,
    notizIntern,
    koKriterien: ko as unknown as Prisma.InputJsonValue,
    bewertetVon: admin.name,
    bewertetAm: new Date(),
  };

  await prisma.assessment.upsert({
    where: { useCaseId },
    create: { useCaseId, ...daten },
    update: daten,
  });

  // Reifegrad / Status ableiten
  let neuerStatus = uc.status;
  let reifegrad: "KURZ" | "PROZESS" | "BEWERTET" | undefined;
  if (alleBeantwortet && !bestanden) {
    neuerStatus = "WARTELISTE";
  } else if (hatWerte && bestanden) {
    reifegrad = "BEWERTET";
    if (uc.status === "EINGEREICHT" || uc.status === "WARTELISTE") neuerStatus = "IN_PRUEFUNG";
  }

  await prisma.useCase.update({
    where: { id: useCaseId },
    data: {
      ...(reifegrad ? { reifegrad } : {}),
      ...(neuerStatus !== uc.status ? { status: neuerStatus as never } : {}),
    },
  });

  await audit({
    actor: `admin:${admin.id}`,
    aktion: "use_case.bewertet",
    zielTyp: "use_case",
    zielId: useCaseId,
    tenantId: uc.tenantId,
    detail: {
      koBestanden: bestanden,
      wertReal: wertReal ?? undefined,
      status: neuerStatus,
    },
  });

  revalidatePath(`/admin/uc/${useCaseId}`);
  revalidatePath("/admin");

  return {
    ok: true,
    hinweis: !bestanden && alleBeantwortet
      ? "K.-o.-Kriterium nicht erfüllt — in die Warteliste verschoben."
      : "Bewertung gespeichert.",
  };
}
