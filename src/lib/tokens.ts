import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

// Zugangstokens und Magic-Link-Tokens werden nie im Klartext gespeichert,
// sondern als HMAC-SHA256 (Konzept Abschnitt 5). Der Klartext wird bei der
// Erzeugung einmalig angezeigt und danach verworfen.

/** URL-taugliches Zufallstoken. */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHmac("sha256", env.tokenHashSecret()).update(token).digest("hex");
}

export function verifyToken(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
