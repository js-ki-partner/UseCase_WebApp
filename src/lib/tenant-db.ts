import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// Zentrale Zugriffsschicht fuer den Einreicher-Kontext (Konzept Abschnitt 6):
// Jede Abfrage im Kundenfrontend laeuft hierueber und traegt zwingend tenant_id.
//
// Regel fuer Code-Review: im Verzeichnis src/app/(public) und in den zugehoerigen
// API-Routen niemals `prisma.useCase.*` direkt aufrufen, immer `tenantDb(id)`.

export function tenantDb(tenantId: string) {
  if (!tenantId) throw new Error("tenantDb ohne tenantId aufgerufen");

  return {
    useCase: {
      findMany: (args?: Omit<Prisma.UseCaseFindManyArgs, "where"> & {
        where?: Prisma.UseCaseWhereInput;
      }) =>
        prisma.useCase.findMany({
          ...args,
          where: { ...args?.where, tenantId },
        }),

      findFirst: (args?: Omit<Prisma.UseCaseFindFirstArgs, "where"> & {
        where?: Prisma.UseCaseWhereInput;
      }) =>
        prisma.useCase.findFirst({
          ...args,
          where: { ...args?.where, tenantId },
        }),

      count: (where?: Prisma.UseCaseWhereInput) =>
        prisma.useCase.count({ where: { ...where, tenantId } }),

      create: (data: Omit<Prisma.UseCaseUncheckedCreateInput, "tenantId">) =>
        prisma.useCase.create({ data: { ...data, tenantId } }),

      update: (
        id: string,
        data: Prisma.UseCaseUncheckedUpdateInput,
      ) =>
        prisma.useCase.updateMany({ where: { id, tenantId }, data }),
    },
  };
}
