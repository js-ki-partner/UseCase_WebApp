"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verteilungGueltig, type Verteilung } from "@/lib/prio";
import { bereinigeRateLimitStore, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";

export interface StimmeState {
  ok: boolean;
  fehler?: string;
}

export async function stimmeAbgeben(
  code: string,
  _prev: StimmeState,
  formData: FormData,
): Promise<StimmeState> {
  const runde = await prisma.prioRunde.findUnique({ where: { zugangsCode: code } });
  if (!runde) return { ok: false, fehler: "Diese Runde gibt es nicht." };
  if (!runde.offen) return { ok: false, fehler: "Die Runde ist geschlossen." };

  bereinigeRateLimitStore();
  const ip = (await clientIp()) ?? "unbekannt";
  if (!rateLimit(`prio:${runde.id}:${ip}`, 10, 600).ok) {
    return { ok: false, fehler: "Zu viele Abgaben in kurzer Zeit." };
  }

  const ids = (runde.useCaseIds as string[]) ?? [];
  const verteilung: Verteilung = {};
  for (const id of ids) {
    const roh = Number(formData.get(`b_${id}`) ?? 0);
    if (roh > 0) verteilung[id] = Math.round(roh);
  }

  const check = verteilungGueltig(verteilung, ids, runde.budgetProTeilnehmer);
  if (!check.ok) return { ok: false, fehler: check.fehler };
  if (check.summe === 0) {
    return { ok: false, fehler: "Bitte verteilen Sie Ihr Budget auf mindestens einen Use Case." };
  }

  const name = String(formData.get("teilnehmerName") ?? "").trim().slice(0, 120) || null;
  await prisma.prioStimme.create({
    data: { prioRundeId: runde.id, teilnehmerName: name, verteilung },
  });

  redirect(`/p/${code}/danke`);
}
