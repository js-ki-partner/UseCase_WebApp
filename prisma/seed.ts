import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";

const prisma = new PrismaClient();

function hashToken(token: string): string {
  const secret = process.env.TOKEN_HASH_SECRET;
  if (!secret) throw new Error("TOKEN_HASH_SECRET fehlt");
  return createHmac("sha256", secret).update(token).digest("hex");
}

async function main() {
  // --- Demo-Tenant ---
  const demoToken = process.env.SEED_TENANT_TOKEN ?? randomBytes(18).toString("base64url");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "muster-maschinenbau" },
    update: {},
    create: {
      slug: "muster-maschinenbau",
      name: "Muster Maschinenbau GmbH",
      openprojectProjectId: null,
      accessTokenHash: hashToken(demoToken),
      tokenExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      stundensatzDefault: 80,
      brandingAccentColor: "#1d4ed8",
    },
  });

  // --- Admin-User ---
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "jens.schmidt@ki-partner.tech";
  const adminPasswort = process.env.SEED_ADMIN_PASSWORT ?? "uc-radar-admin";
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Jens Schmidt",
      passwortHash: await bcrypt.hash(adminPasswort, 12),
      totpAktiv: false,
    },
  });

  // --- Beispiel-Use-Case (Anhang des Konzepts) ---
  const vorhanden = await prisma.useCase.findFirst({
    where: { tenantId: tenant.id, rolle: "Vertriebsinnendienst" },
  });
  if (!vorhanden) {
    await prisma.useCase.create({
      data: {
        tenantId: tenant.id,
        problemText:
          "Wenn eine Anfrage per E-Mail reinkommt, muss ich die Angaben von Hand ins Angebotstool übertragen, Preise aus der Preisliste suchen und das Angebot als PDF zurückschicken. Bei unklaren Anfragen muss ich nochmal nachfragen.",
        wunschergebnis:
          "Angebotsentwurf liegt fertig vor, ich prüfe und schicke ab.",
        rolle: "Vertriebsinnendienst",
        anzahlBetroffene: 4,
        frequenz: "TAEGLICH",
        dauerMinuten: 25,
        stundenpotenzialPa: 367,
        reifegrad: "KURZ",
        status: "EINGEREICHT",
        einreicherName: null,
        istAnonym: true,
      },
    });
  }

  console.log("\nSeed abgeschlossen.");
  console.log("--------------------------------------------------");
  console.log(`Einreicher-Link:  http://localhost:3000/muster-maschinenbau?t=${demoToken}`);
  console.log(`Admin-Login:      http://localhost:3000/admin/login`);
  console.log(`  E-Mail:         ${adminEmail}`);
  console.log(`  Passwort:       ${adminPasswort}`);
  console.log("  2FA:            beim ersten Login einrichten");
  console.log("--------------------------------------------------\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
