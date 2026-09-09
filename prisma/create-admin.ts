import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Legt einen Admin-User an oder aktualisiert dessen Passwort. Fuer die
// Produktion (kein Demo-Tenant, keine Beispieldaten).
//
//   docker compose -f docker-compose.prod.yml exec \
//     -e ADMIN_EMAIL=... -e ADMIN_NAME=... [-e ADMIN_PASSWORT=...] \
//     app npm run db:admin
//
// Ohne ADMIN_PASSWORT wird ein Zufallspasswort erzeugt und einmalig ausgegeben.

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const name = (process.env.ADMIN_NAME ?? "").trim();
  if (!email || !name) {
    console.error("ADMIN_EMAIL und ADMIN_NAME sind erforderlich.");
    process.exit(1);
  }

  const passwort =
    process.env.ADMIN_PASSWORT?.trim() ||
    randomBytes(12).toString("base64url").slice(0, 16);
  const passwortHash = await bcrypt.hash(passwort, 12);

  const bestehend = await prisma.adminUser.findUnique({ where: { email } });
  await prisma.adminUser.upsert({
    where: { email },
    update: { name, passwortHash },
    create: { email, name, passwortHash, totpAktiv: false },
  });

  console.log("\n--------------------------------------------------");
  console.log(bestehend ? "Admin aktualisiert:" : "Admin angelegt:");
  console.log(`  E-Mail:   ${email}`);
  if (!process.env.ADMIN_PASSWORT) {
    console.log(`  Passwort: ${passwort}   (jetzt notieren)`);
  } else {
    console.log("  Passwort: (wie uebergeben)");
  }
  console.log("  2FA:      beim ersten Login einrichten");
  console.log("--------------------------------------------------\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
